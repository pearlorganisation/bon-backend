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
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        
      },
    },
    rating: { type: Number, default: 0 },
    amenities: [String],
    checkIn: { type: Date },
    checkOut: { type: Date },
    Images: [{ secure_url: String, public_id: String }],
    Videos: [{ secure_url: String, public_id: String }],
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    verified: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
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

propertySchema.virtual("Rooms", {
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
