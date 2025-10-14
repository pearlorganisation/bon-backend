import mongoose from "mongoose";

const propertySchema = new mongoose.Schema(
  {
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth",
      required: true,
    },

    name: { type: String, required: true },
    description: String,
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, required: true },
    pincode: String,
    geoLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
        required: true,
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    rating: { type: Number, default: 0 },
    amenities: [String],
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    Images: [{ url: String, public_id: String }],
    Videos: [{ url: String, public_id: String }],
    status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" },
    //     commissionPercentage: { type: Number, default: 10 },
    //     externalIds: {
    //       makeMyTrip: { type: String },
    //       booking: { type: String },
    //     },
  },
  { timestamps: true }
);

// ✅ 2dsphere index for geospatial queries
propertySchema.index({ geoLocation: "2dsphere" });

export default mongoose.model("Property", propertySchema);
