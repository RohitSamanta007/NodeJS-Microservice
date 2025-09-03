import jwt from "jsonwebtoken";
import crypto from "crypto"
import refreshToken from "../models/refreshToken.js";


export const generateToken = async (user) => {
  const assessToken = jwt.sign(
    {
      userId: user._id,
      userName: user.userName,
    },
    process.env.JWT_SECRET,
    { expiresIn: "60m" }
  );

  const refreshTokenCreation = crypto.randomBytes(40).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // refresh token expires in 7 days

  await refreshToken.create({
    token: refreshTokenCreation,
    user: user._id,
    expiresAt
  })

  return { assessToken, refreshTokenCreation };
};
