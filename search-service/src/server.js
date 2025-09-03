import express from "express";
import "dotenv/config";
import cors from "cors";
import mongoose from "mongoose";
import Redis from "ioredis";
import helmet from "helmet";
import errorHandler from "./middlewares/error-handler.js";
import logger from "./utils/logger.js";
import { connectToRabbitMQ, consumeEvent } from "./utils/rabbitmq.js";
import searchRouter from "./routes/search-routes.js";
import { handlePostCreated, handlePostDeleted } from "./event-hadlers/search-eventHandlers.js";

const app = express();
const port = process.env.PORT || 3004;

// mongodb connection
mongoose
  .connect(process.env.MONGODB_URL)
  .then(() => {
    logger.info("Mongodb connected successfully");
  })
  .catch(() => {
    logger.error("Mongodb connection failed");
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

app.use("/api/search", searchRouter);

// error handler
app.use(errorHandler);

//start server with rabbit mq
async function startServer() {
  try {
    await connectToRabbitMQ();

    // consume the event or subcribe the events
    await consumeEvent("post.created", handlePostCreated)
    await consumeEvent("post.deleted", handlePostDeleted)

    app.listen(port, () => {
      logger.info(`Post service is running on port no : ${port}`);
      console.log("Post Service is running on port no : ", port);
    });
  } catch (error) {
    logger.error(`Failed to connect to server : ${error}`);
    console.log("Failed to connect to server (rabbitMq)");
    process.exit(1);
  }
}

startServer();

// unhandled promise rejection
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at : ", promise, ", reason : ", reason);
});
