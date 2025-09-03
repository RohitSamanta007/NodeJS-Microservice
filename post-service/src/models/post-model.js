import mongoose from "mongoose"

const postSchema = mongoose.Schema({
    user: {type: mongoose.Schema.Types.ObjectId, ref: "user", required: true},
    title: {type: String, required: true},
    content: {type: String, required: true},
    mediaIds: [{type: String}],
    createdAt: {type: Date, default: Date.now()}, 
}, {timestamps: true})

// because we will be having a diff service for search
postSchema.index({content: "text"});

const Post = mongoose.model("Post", postSchema);
export default Post;