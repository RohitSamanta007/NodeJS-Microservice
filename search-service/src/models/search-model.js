import mongoose from "mongoose";

const searchPostSchema = mongoose.Schema(
  {
    postId: { type: String, required: true, unique: true },
    userId: { type: String, required: true , index: true},
    content: { type: String, required: true },
    createdAt: { type: Date, required: true },
  },
  { timestamps: true }
);

searchPostSchema.index({content: "text"})
searchPostSchema.index({createdAt: -1})

const SearchPost = mongoose.model("SearchPost", searchPostSchema);

export default SearchPost;
