// models/RoomInventory.js
import mongoose from "mongoose";

const roomInventorySchema = new mongoose.Schema(
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
    date: {
      type: Date, // normalized to 00:00 UTC
      required: true,
      index: true,
    },
    totalRooms: {
      type: Number, // snapshot from Room.numberOfRooms
      required: true,
    },
    bookedRooms: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

//  Prevent duplicate inventory rows
roomInventorySchema.index({ roomId: 1, date: 1 }, { unique: true });

export default mongoose.model("RoomInventory", roomInventorySchema);
