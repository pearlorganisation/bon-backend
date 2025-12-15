import mongoose from "mongoose";

const supportCallSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth",
      required: true,
    },

    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },

    issue: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "IN_PROGRESS", "COMPLETED", "FAILED"],
      default: "PENDING",
    },

    handledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth", // Admin
    },

    calledAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

export default mongoose.model("SupportCall", supportCallSchema);
