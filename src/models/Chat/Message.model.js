import mongoose from "mongoose";

const attachmentSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ["image", "file"],
    required: true,
  },
});

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },

    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth",
      required: true,
    },

    senderRole: {
      type: String,
      enum: ["CUSTOMER", "PARTNER"],
      required: true,
    },

    text: {
      type: String,
      trim: true,
    },

    attachments: {
      type: [attachmentSchema],
      default: [],
    },

    seenBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Auth",
      },
    ],
  },
  { timestamps: true }
);

// Prevent empty messages
messageSchema.pre("save", function (next) {
  if (!this.text && this.attachments.length === 0) {
    return next(new Error("Message must have text or attachment"));
  }
  next();
});

export default mongoose.model("Message", messageSchema);
