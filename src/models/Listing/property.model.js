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
    verified: { type: String, enum: ["PENDING", "APPROVED", "REJECTED"], default: "PENDING" },
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

propertySchema.virtual("rooms", {
  ref: "Room",
  localField: "_id",
  foreignField:"propertyId",
});

propertySchema.virtual("Bookings", {
  ref: "Booking",
  localField: "_id",
  foreignField: "propertyId",
});

// To include virtuals in JSON output
propertySchema.set('toJSON', { virtuals: true });
propertySchema.set('toObject', { virtuals: true });

export default mongoose.model("Property", propertySchema);
