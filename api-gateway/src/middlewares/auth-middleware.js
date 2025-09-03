import logger from "../utils/logger.js";
import jwt from "jsonwebtoken"

export const validateToken = (req, res, next) =>{
    const authHeader = req.headers["authorization"];

    const token = authHeader && authHeader.split(" ")[1];
    if(!token){
        logger.warn("Access attempt without valid authorization token");
        return res.status(401).json({
            success: false,
            message: "Authenticaiton required",
        })
    }
    
    // verify token
    jwt.verify(token, process.env.JWT_SECRET, (error, user) => {
        if(error){
            logger.warn("Access attempt without invalid authorization token");
            return res.status(429).json({
                success: false,
                message: "Invalid token!",
            })
        }

        req.user = user;
        next();
    })
}