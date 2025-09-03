import logger from "../utils/logger.js";
import Search from "../models/search-model.js";

export async function handlePostCreated(event) {
  try {
    const newSearchPost = new Search({
      postId: event.postId,
      userId: event.userId,
      content: event.content,
      createdAt: event.createdAt,
    });

    await newSearchPost.save();
    logger.info(
      `Search post : ${newSearchPost._id.toString()} is created for post Id : ${
        event.postId
      }`
    );
  } catch (error) {
    logger.error(`Error in handling post creation event : ${error}`);
  }
}

export async function handlePostDeleted(event) {
  try {
    const deletedPost = await Search.findOneAndDelete({ postId: event.postId });
    logger.info(
      `Search post : ${deletedPost._id.toString()} is deleted for post Id : ${
        event.postId
      }`
    );
  } catch (error) {
    logger.error(`Error in handling post Deletion event : ${error}`);
  }
}
