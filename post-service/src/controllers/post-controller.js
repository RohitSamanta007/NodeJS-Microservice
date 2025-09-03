import Post from "../models/post-model.js";
import logger from "../utils/logger.js";
import { publishEvent } from "../utils/rabbitmq.js";
import { validatePost } from "../utils/validation.js";

async function invalidatePostCache(req, input) {
  const cachedKey = `post:${input}`;
  await req.redisClient.del(cachedKey);

  const keys = await req.redisClient.keys("posts:*");
  if (keys.length > 0) {
    await req.redisClient.del(keys);
  }
}

export const createPost = async (req, res) => {
  logger.info("Create Post endpoint hit...");

  try {
    const { error } = validatePost(req.body);
    if (error) {
      logger.warn("Post validation error : ", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { title, content, mediaIds } = req.body;
    const newPost = new Post({
      user: req.user.userId,
      title,
      content,
      mediaIds: mediaIds || [],
    });
    await newPost.save();

    // rebbit_mq event to search service
    await publishEvent("post.created", {
      postId: newPost._id.toString(),
      userId: newPost.user.toString(),
      content: newPost.content,
      createdAt: newPost.createdAt,
    });

    // invalidate redis cache
    await invalidatePostCache(req, newPost._id.toString());

    logger.info("Post created successfully");
    return res.status(201).json({
      success: true,
      message: "Post created successfully",
    });
  } catch (error) {
    logger.warn("Error in create post controller : ", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getAllPosts = async (req, res) => {
  logger.info("Get all Posts endpoint hit...");

  try {
    // doing pagaination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;

    // chaching with redis
    const cacheKey = `posts:${page}:${limit}`;
    const cachedPosts = await req.redisClient.get(cacheKey);

    if (cachedPosts) {
      return res.status(201).json({
        success: true,
        ...JSON.parse(cachedPosts),
      });
    }

    const posts = await Post.find({})
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);
    const total = await Post.countDocuments();

    const result = {
      currentPage: page,
      totalPage: Math.ceil(total / limit),
      totalPosts: total,
      posts,
    };

    // save in redis cache
    await req.redisClient.setex(cacheKey, 5 * 60, JSON.stringify(result)); // chached stores for 5 mins

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.warn("Error in Fetching all posts : ", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getPostById = async (req, res) => {
  logger.info("Get Post by Id endpoint hit...");

  try {
    const postId = req.params.id;

    const cacheKey = `post:${postId}`;
    const cachedPost = await req.redisClient.get(cacheKey);

    if (cachedPost) {
      return res.status(200).json({
        success: true,
        ...JSON.parse(cachedPost),
      });
    }

    const singlePost = await Post.findById(postId);

    if (!singlePost) {
      logger.warn("Post not found with postId");
      return res.status(404).json({
        success: false,
        message: "Post not found with this PostId.",
      });
    }

    await req.redisClient.setex(cacheKey, 5 * 60, JSON.stringify(singlePost));

    return res.status(200).json({
      success: true,
      post: singlePost,
    });
  } catch (error) {
    logger.warn("Error in getting post by id : ", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const deletePostById = async (req, res) => {
  logger.info("Delete Post by Id endpoint hit...");

  try {
    const deletedPost = await Post.findOneAndDelete({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!deletedPost) {
      logger.warn("Post not found for delete");
      return res.status(401).json({
        success: false,
        message: "Post not found",
      });
    }

    // publish post delete -> rabbit mq message
    await publishEvent("post.deleted", {
      postId: deletedPost._id.toString(),
      userId: req.user.userId,
      mediaIds: deletedPost.mediaIds,
    });

    // invalidate redis cache
    await invalidatePostCache(req, req.params.id);

    logger.info("Post delete successfully");
    return res.status(200).json({
      success: true,
      message: "Post deleted successfully",
      deletedPost,
    });
  } catch (error) {
    logger.warn("Error in Delete post by id : ", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
