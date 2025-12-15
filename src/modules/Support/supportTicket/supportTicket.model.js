import mongoose from "mongoose";

const supportTicketSchema = new mongoose.Schema(
  {
    // 🔗 Customer who created ticket
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth",
      required: true,
    },

    issueType: {
      type: String,
      required: true,
      trim: true,
    },

    subject: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"],
      default: "OPEN",
    },

    // 🧑 Admin who handled ticket
    handledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth",
    },

    resolvedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

export default mongoose.model("SupportTicket", supportTicketSchema);
