import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth",
      required: true,
    },

    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth",
      required: true,
    },

    lastMessage: {
      type: String,
    },

    lastMessageAt: {
      type: Date,
    },

    unreadCountCustomer: {
      type: Number,
      default: 0,
    },

    unreadCountPartner: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["active", "closed"],
      default: "active",
    },
  },
  { timestamps: true }
);

conversationSchema.index(
  { propertyId: 1, customerId: 1 },
  { unique: true }
);

export default mongoose.model("Conversation", conversationSchema);
