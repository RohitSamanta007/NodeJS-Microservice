console.log("Hello from server");

import express from "express";
import "dotenv/config";
import identiryRoutes from "./routes/identity-route.js";
import mongoose from "mongoose";
import logger from "./utils/logger.js";
import helmet from "helmet";
import cors from "cors";
import { RateLimiterRedis } from "rate-limiter-flexible";
import Redis from "ioredis";
import {rateLimit} from "express-rate-limit"
import {RedisStore} from "rate-limit-redis"
import errorHandler from "./middlewares/errorHandlers.js";

const port = process.env.PORT || 4001;
const app = express();

// connect to database
mongoose
  .connect(process.env.MONGODB_URL)
  .then(() => {
    logger.info("Mongodb connected successfully");
    console.log("Monogdb connected successfulyy");
  })
  .catch((error) => {
    logger.warn("Error in connection mongodb : ", error);
    console.log("Error in connecting monogdb : ", error);
  });

// middlewars
app.use(express.json());
app.use(helmet());
app.use(cors());
app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to ${(req.url)}`);
  logger.info(`Request body : ${req.body}`);
  next();
});

// redis
const redisClient = new Redis(process.env.REDIS_URL);

// DDos protection and rate limitting
const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "middleware", // this distingush rate limit data from other data
  points: 10, // maximum number of request an ip address can make in a time period
  duration: 1, // this is the time period , value in seconds
});

// rate limiting middlware
app.use((req, res, next) => {
  rateLimiter
    .consume(req.ip)
    .then(() => next())
    .catch((error) => {
      logger.warn(`Rate limit exceeded for IP : ${req.ip}`);
      return res.status(429).json({
        success: false,
        message: "Too many requests",
      });
    });
});

//Ip based rate limiting for sensitive endpoints
const sensitiveEndpointsLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // this is for 15 minutes
    max: 50, // maximum number of request
    standardHeaders: true, // tell whether want to include the rate-limit info in the response headers or not and also this allow the client to see how many request have left for that current time window
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn("Sensitive endpoint rate limit exceeded for IP : ", req.ip);
        res.status(429).json({
            success:false,
            message: "Too many requests"
        })
    },
    store: new RedisStore({
        sendCommand: (...args) => redisClient.call(...args),
    })

})

// apply this sensitiveEndpointLimiter to our routes 
app.use("/api/auth/register", sensitiveEndpointsLimiter)

// routes
app.use("/api/auth", identiryRoutes);

// error Handlers
app.use(errorHandler)

// app listen
app.listen(port, () => {
    logger.info(`Identity service running on port no : ${port}`);
    console.log("Identity server is running on port no : ", port);
}
);

// unhandled promise rejection
process.on("unhandledRejection", (reason, promise) =>{
    logger.error("Unhandled Rejection at : ", promise, ", reason : ", reason)
})
