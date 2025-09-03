import Search from "../models/search-model.js";
import logger from "../utils/logger.js";

export const searchPost = async (req, res) => {
  logger.info("Search Post endpoint hit...");

  try {
    const { query } = req.query;

    const results = await Search.find(
      {
        $text: { $search: query },
      },
      {
        score: { $meta: "textScore" },
      }
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(10);

      return res.status(200).json({
        success: true,
        results,
      })

  } catch (error) {
    logger.error(`Error in Search post controller : ${error}`);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const searchPo = async (req, res) => {
  logger.info("Search Post endpoint hit...");

  try {
  } catch (error) {
    logger.error(`Error in Search post controller : ${error}`);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
