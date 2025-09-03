import Media from "../models/media-model.js";
import { deleteMediaFromCloudinary } from "../utils/cloudinary.js";
import logger from "../utils/logger.js";

export const handlePostDeleted = async (event) => {
  // console.log("The value of event is : ", event)

  const { postId, mediaIds } = event;

  try {
    const mediaToDelete = await Media.find({
      _id: { $in: mediaIds },
    });

    for (const media of mediaToDelete) {
      await deleteMediaFromCloudinary(media.publicId);
      await Media.findByIdAndDelete(media._id);

      logger.info(`Deleted media ${media._id} associated with this deleted post : ${postId}`)
    }
    logger.info(`Processed deletion of media for post id : ${postId}`)

  } catch (error) {
    logger.error(
      `Error occurred while handeling with media delete event : ${error}`
    );
  }
};
