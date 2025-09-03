console.log("Hello from media service");

import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import logger from "./utils/logger.js";
import errorHandler from "./middlewares/error-handler.js";
import mongoose from "mongoose";
import mediaRoutes from "./routes/media-routes.js"
import { connectToRabbitMQ, consumeEvent } from "./utils/rabbitmq.js";
import { handlePostDeleted } from "./event-handlers/media-eventHandler.js";

const app = express();
const port = process.env.PORT || 3003;

// mongodb connection
mongoose
  .connect(process.env.MONGODB_URL)
  .then(() => {
    logger.info("MongogDB connected successfully");
    console.log("MongogDB connected successfully");
  })
  .catch((error) => {
    logger.error(`MongoDb connection error : ${error}`);
    console.log(`MongoDb connection error : ${error}`);
  });

  // middleware
  app.use(cors());
  app.use(express.json());
  app.use(helmet());
  app.use((req, res, next) => {
    logger.info(`Received ${req.method} request to ${req.url}`);
    logger.info(`Request body : ${req.body}`);
    next();
  });


  // TODO : create ip based rate limitin on specific end points like create-post -> 10posts/min, getallPost -> 20/min etc


  // routes
  app.use("/api/media", mediaRoutes)

  // error handler for routes
  app.use(errorHandler)


  // start server with rabbit mq
  async function startServer(){
    try {
      await connectToRabbitMQ();

      // consume all the events
      await consumeEvent("post.deleted", handlePostDeleted)

      app.listen(port, () => {
        logger.info(`Media service is running on port : ${port}`);
        console.log(`Media service is running on port : ${port}`);
      });
    } catch (error) {
      logger.error(`Failed to connect to server : ${error}`);
      console.log("Failed to connect to server (rabbitMq)");
      process.exit(1);
    }
  }

  startServer();


  // unhandled promise rejection
  process.on("unhandledRejection", (reason, promise) =>{
    logger.error(`Unhandled Rejection at : ${promise}, reason : ${reason}`)
  })