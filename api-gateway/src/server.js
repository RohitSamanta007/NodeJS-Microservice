import "dotenv/config";
import express from "express";
import cors from "cors";
import Redis from "ioredis";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import logger from "./utils/logger.js";
import proxy from "express-http-proxy";
import errorHandler from "./middlewares/errorHandler.js";
import { validateToken } from "./middlewares/auth-middleware.js";

const app = express();
const port = process.env.PORT || 3000;

const redisClient = new Redis(process.env.REDIS_URL);

app.use(cors());
app.use(helmet());
app.use(express.json());

// rate limiting
const rateLimitOptions = rateLimit({
  windowMs: 15 * 60 * 1000, // this is for 15 minutes
  max: 100, // maximum number of request
  standardHeaders: true, // tell whether want to include the rate-limit info in the response headers or not and also this allow the client to see how many request have left for that current time window
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn("Sensitive endpoint rate limit exceeded for IP : ", req.ip);
    res.status(429).json({
      success: false,
      message: "Too many requests",
    });
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
});

// rate limiting middlware
app.use(rateLimitOptions);

// logger middleware
app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to ${req.url}`);
  logger.info(`Request body : ${req.body}`);
  next();
});

// implement proxy to redirect
const proxyOptions = {
  proxyReqPathResolver: (req) => {
    return req.originalUrl.replace(/^\/v1/, "/api");
  },
  proxyErrorHandler: (err, res, next) => {
    logger.error(`Proxy error : ${err.message}`);
    res.status(500).json({
      success: false,
      message: `Internal Server error : ${err.message}`,
    });
  },
};

// setting up proxy for our identity service
app.use(
  `/v1/auth`,
  proxy(process.env.IDENTITY_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["Content-Type"] = "application/json";
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response received from Identity service : ${proxyRes.statusCode}`
      );
      return proxyResData;
    },
  })
);

// setting up proxy for our post service
app.use(
  "/v1/posts",
  validateToken,
  proxy(process.env.POST_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["Content-Type"] = "application/json";
      proxyReqOpts.headers["x-user-id"] = srcReq.user.userId;
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response received from Post service : ${proxyRes.statusCode}`
      );
      return proxyResData;
    },
  })
);

// setting up proxy for our Media service
app.use(
  "/v1/media",
  validateToken,
  proxy(process.env.MEDIA_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["x-user-id"] = srcReq.user.userId;

      if (!srcReq.headers["content-type"].startsWith("multipart/form-data")) {
        // In Node.js/Express, all request header keys are lowercased automatically.
        proxyReqOpts.headers["Content-Type"] = "application/json";
      }
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response received from Media Service : ${proxyRes.statusCode}`
      );
      return proxyResData;
    },
    parseReqBody: false,
  })
);

// setting up proxy for search service
app.use(
  "/v1/search",
  validateToken,
  proxy(process.env.SEARCH_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["Content-Type"] = "application/json";
      proxyReqOpts.headers["x-user-id"] = srcReq.user.userId;

      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response received from Search Service : ${proxyRes.statusCode}`
      );
      return proxyResData;
    },
  })
);

// error handleing
app.use(errorHandler);

// listen
app.listen(port, () => {
  logger.info(`Api Gateway is running on port no : ${port}`);
  logger.info(
    `Identity Sevice is running on : ${process.env.IDENTITY_SERVICE_URL}`
  );
  logger.info(`Post Sevice is running on : ${process.env.POST_SERVICE_URL}`);
  logger.info(`Media Sevice is running on : ${process.env.MEDIA_SERVICE_URL}`);
  logger.info(`Search Sevice is running on : ${process.env.SEARCH_SERVICE_URL}`);

  logger.info(`Redis Url : ${process.env.REDIS_URL}`);
  console.log("Api Gateway is runngin on port no : ", port);
});
