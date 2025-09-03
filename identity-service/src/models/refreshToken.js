import mongoose from "mongoose";

const refreshTokenSchema = mongoose.Schema({
    token: {type: String, required: true, unique: true},
    user: {type: mongoose.Schema.Types.ObjectId, ref: "user", required: true},
    expiresAt: {type: Date, required: true}
}, {timestamps: true});

refreshTokenSchema.index({expiresAt: 1}, {expiresAfterSeconds: 0});

const refreshToken = mongoose.model("refershToken", refreshTokenSchema);
export default refreshToken;