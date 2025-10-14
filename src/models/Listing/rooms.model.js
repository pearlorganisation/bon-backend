import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },
    name: { type: String, required: true }, // e.g., "Deluxe Room"
    description: String,
    capacity: { type: Number, default: 2 },
    pricePerNight: { type: Number, required: true },
    type: {
      type: String,
      enum: ["SINGLE", "DOUBLE", "DELUXE", "SUITE"],
      default: "SINGLE",
    },
    amenities: [String],
    images: [{ url: String, public_id: String }],
    videos: [{ url: String, public_id: String }],

    // ✅ Partner-defined availability periods
    availability: [
      {
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
      },
    ],

    // Optional: blocked dates (maintenance, holidays)
    blockedDates: [
      {
        startDate: Date,
        endDate: Date,
        reason: String,
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("Room", roomSchema);
