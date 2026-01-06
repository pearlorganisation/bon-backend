// models/Blog.js
import mongoose from "mongoose";

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    content: {
      type: String, 
      required: true,
    },
    coverImage: {
      type: String,
      default: null,
    },
    
    images: [
        {
            type: String
        }
    ],

    category: {
      type: String,
      default: "General",
    },
    tags: [String],

    seoTitle: String,
    seoDescription: String,

    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Blog", blogSchema);
