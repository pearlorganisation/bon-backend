import mongoose from "mongoose";

const manualRoomBlockSchema = new mongoose.Schema(
  {
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
      index: true,
    },

    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
      index: true,
    },

    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth",
      required: true,
      index: true,
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    rooms: {
      type: Number,
      required: true,
      min: 1,
    },

    reason: {
      type: String,
      enum: ["OFFLINE_BOOKING", "MAINTENANCE", "OWNER_BLOCK", "OTHER"],
      default: "OTHER",
      required:true,
    },

    notes: {
      type: String,
      trim: true,
    },

    released: {
      type: Boolean,
      default: false,
    },

    releasedAt: {
      type: Date,
    },

    releasedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth",
    },
  },
  { timestamps: true }
);

manualRoomBlockSchema.index({ roomId: 1, startDate: 1, endDate: 1 });

export default mongoose.model("ManualRoomBlock", manualRoomBlockSchema);
