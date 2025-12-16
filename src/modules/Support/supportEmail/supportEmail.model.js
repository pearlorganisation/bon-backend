// src/models/supportEmail.model.js
import mongoose from "mongoose";

const supportEmailSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth",
    },

    email: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"],
      default: "OPEN",
    },

    handledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth",
    },
  },
  { timestamps: true }
);

export default mongoose.model("SupportEmail", supportEmailSchema);
