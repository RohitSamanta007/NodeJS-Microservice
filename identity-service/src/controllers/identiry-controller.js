import refreshToken from "../models/refreshToken.js";
import user from "../models/user-model.js";
import { generateToken } from "../utils/generateToken.js";
import logger from "../utils/logger.js";
import {
  validateLogin,
  validateRegistration,
} from "../utils/validationSchema.js";

// register user
export const registerUser = async (req, res) => {
  logger.info("Registration endpoint hit....");
  try {
    const { error } = validateRegistration(req.body);
    if (error) {
      logger.warn("Validation error : ", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { userName, email, password } = req.body;
    const existingUser = await user.findOne({ $or: [{ email }, { userName }] });
    if (existingUser) {
      logger.warn("User already present");
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    const newUser = new user({ userName, email, password });
    await newUser.save();
    logger.warn("User saved successfully", user._id);

    const { assessToken, refreshTokenCreation: refreshToken } =
      await generateToken(newUser);

    return res.status(200).json({
      success: true,
      message: "Registration done successfully",
      assessToken,
      refreshToken,
    });
  } catch (error) {
    logger.error("Registration error occured : ", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// login user
export const loginUser = async (req, res) => {
  logger.info("Login endpoint hit ...");
  try {
    const { error } = validateLogin(req.body);
    if (error) {
      logger.warn("Validation error : ", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { email, password } = req.body;
    const existingUser = await user.findOne({ email });
    if (!existingUser) {
      logger.warn("Invalid User");
      return res.status(400).json({
        success: false,
        message: "User not found with this email",
      });
    }

    // if user is present : check for valid password or not
    const isValidPassword = await existingUser.comparePassword(password);
    if (!isValidPassword) {
      logger.warn("Invalid Password");
      return res.status(400).json({
        success: false,
        message: "Wrong Password",
      });
    }

    const { assessToken, refreshTokenCreation: refreshToken } =
      await generateToken(existingUser);

    return res.status(200).json({
      success: true,
      message: "Login successfull",
      assessToken,
      refreshToken,
      userId: existingUser._id,
    });
  } catch (error) {
    logger.error("Login error occured : ", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// refresh token
export const refreshTokenUser = async (req, res) => {
  logger.info("Refresh token endpoint hit ....");
  try {
    const { refreshToken: token } = req.body;
    if (!token) {
      logger.warn("Refresh token missing");
      return res.status(400).json({
        success: false,
        message: "Missing refresh token",
      });
    }

    const storedToken = await refreshToken.findOne({ token });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      logger.warn("Invalid or expired refresh token");
      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token",
      });
    }

    const existingUser = await user.findById(storedToken.user);
    if (existingUser) {
      logger.warn("User not found for this refresh token");
      return res.status(400).json({
        success: false,
        message: "User not found for this refresh token",
      });
    }

    const {
      assessToke: newAccessToken,
      refreshTokenCreation: newRefreshToken,
    } = await generateToken(existingUser);

    // delete the old refresh token
    await refreshToken.deleteOne({ _id: storedToken._id });

    return res.status(201).json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    logger.error(
      "Refresh token getting controller function error occured : ",
      error
    );
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// logout
export const logoutUser = async (req, res) => {
  logger.info("Logout endpoint hit ...");

  try {

    const {refreshToken:token} = req.body;
    if (!token) {
      logger.warn("Refresh token missing");
      return res.status(400).json({
        success: false,
        message: "Missing refresh token",
      });
    }

    await refreshToken.deleteOne({token})
    logger.info("Refresh token deleted for logout")

    return res.status(200).json({
      success:true,
      message: "Logout successfully",
    })

  } catch (error) {
    logger.error("Logout Error : ", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
