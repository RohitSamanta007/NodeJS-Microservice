import express from "express"
import { authenticateRequest } from "../middlewares/auth-middleware.js"
import { searchPost } from "../controllers/search-controller.js";

const router = express();

// auth middleware
router.use(authenticateRequest);

// routes
router.get('/posts', searchPost);


export default router;