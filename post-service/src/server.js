console.log("Hello from the Post-service");

import express from "express";
import "dotenv/config";
import cors from "cors";
import mongoose from "mongoose";
import Redis from "ioredis";
import helmet from "helmet";
import postRoutes from "./routes/post-route.js";
import errorHandler from "./middlewares/error-handler.js";
import logger from "./utils/logger.js";
import { connectToRabbitMQ } from "./utils/rabbitmq.js";

const app = express();
const port = process.env.PORT || 3002;

// mongodb connection
mongoose
  .connect(process.env.MONGODB_URL)
  .then(() => {
    logger.info("Mongodb connected successfully");
  })
  .catch(() => {
    logger.warn("Mongodb connection failed");
    console.log("Mongodb connection failed");
  });


// middlware
app.use(cors());
app.use(helmet());
app.use(express.json());
// logger middleware
app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to ${req.url}`);
  logger.info(`Request body : ${req.body}`);
  next();
});


// TODO : create ip based rate limitin on specific end points like create-post -> 10posts/min, getallPost -> 20/min etc
// Redis
const redisClient = new Redis(process.env.REDIS_URL);


// routes
app.use("/api/posts",(req, res, next) => {
    req.redisClient = redisClient;
    next();
} ,postRoutes);

// error handler
app.use(errorHandler)


async function startServer(){
  try {
    await connectToRabbitMQ();
    app.listen(port, () => {
      logger.info(`Post service is running on port no : ${port}`);
      console.log("Post Service is running on port no : ", port);
    });
  } catch (error) {
    logger.error(`Failed to connect to server : ${error}`);
    console.log("Failed to connect to server (rabbitMq)")
    process.exit(1);
  }
}

startServer();

