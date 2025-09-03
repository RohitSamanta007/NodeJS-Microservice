
import logger from "../utils/logger.js";
import { uploadMediaToCloudinary } from "../utils/cloudinary.js";
import Media from "../models/media-model.js";

export const uploadMedia = async(req , res) =>{
    logger.info("Upload media endpoint hit...");

    try {
        
        if(!req.file){
            logger.warn("No file present");
            return res.status(400).json({
                success: false,
                message: "No file found! Please select a file and try again"
            })
        }

        const {originalname, mimetype, buffer} = req.file;
        const userId = req.user.userId;

        logger.info(`File details : name=${originalname}, type=${mimetype}`)
        logger.info("Uploading to cloudinary starting...")

        // upload to coludinary
        const cloudinaryUploadResult = await uploadMediaToCloudinary(req.file)
        logger.info(`Cloudinary upload successfull. Public Id : ${cloudinaryUploadResult.public_id}`)

        // create new entry to database
        const newMedia = new Media({
            publicId: cloudinaryUploadResult.public_id,
            originalName: originalname,
            mimeType: mimetype,
            url: cloudinaryUploadResult.secure_url,
            userId
        })
        await newMedia.save();

        return res.status(201).json({
            success: true,
            message: "New Media created successfully",
            mediaId: newMedia._id,
            mediaUrl: newMedia.url,
        })

    } catch (error) {
        logger.error("Error in upload media");
        return res.status(500).json({
            success: false,
            message: "Internal server Error",
        })    
    }
}

export const getAllMedias = async(req , res) =>{
    logger.info("get all media endpoint hit...");

    try {

        const result = await Media.find({});
        return res.status(200).json({
            success: true,
            result,
        })
        
    } catch (error) {
        logger.warn(`Error in get all media . error : ${error}`);
        return res.status(500).json({
            success: false,
            message: "Internal server Error",
        })    
    }
}