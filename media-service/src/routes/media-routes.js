import express from "express";
import multer from "multer";
import { getAllMedias, uploadMedia } from "../controllers/media-controllers.js";
import { authenticateRequest } from "../middlewares/auth-middleware.js";
import logger from "../utils/logger.js";

const router = express.Router();

// configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // maximum file size 20mb
  },
}).single("file");

// routes
router.post(
  "/upload",
  authenticateRequest,
  (req, res, next) => {
    upload(req, res, function (error) {
      if (error instanceof multer.MulterError) {
        logger.error("Multer error while uploading : ", error);
        return res.status(400).json({
          success: false,
          message: "Multer error while uploading",
          error: error.stack,
        });
      } else if (error) {
        logger.error("Unknown error occured  while uploading : ", error);
        return res.status(500).json({
          success: false,
          message: "Unknown error while uploading",
          error: error.stack,
        });
      }

      if (!req.file) {
        return res.status(400).json({
          message: "No file found",
          success: false,
        });
      }

      next();
    });
  },
  uploadMedia
);

router.get("/all-media", authenticateRequest, getAllMedias)

export default router;
