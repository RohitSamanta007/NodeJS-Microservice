import express from "express"
import { authenticateRequest } from "../middlewares/auth-middleware.js";
import { createPost, deletePostById, getAllPosts, getPostById } from "../controllers/post-controller.js";

const router = express.Router();

// middleware -> this will tell if the user in authenticated or not
router.use(authenticateRequest) // this pass all request through this middelware for this route

router.post("/create-post", createPost);
router.get("/all-posts", getAllPosts); 
router.get("/post/:id", getPostById); 
router.delete("/delete-post/:id", deletePostById); 


export default router;