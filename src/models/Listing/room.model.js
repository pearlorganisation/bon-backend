import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },
    name: { type: String }, // e.g., "Deluxe Room"
    capacity: { type: Number, default: 2 },
    pricePerNight: { type: Number, required: true },
    discount: {
      type: Number, // percent or flat
      default: 0,
    },
    type: {
      type: String,
      enum: ["single", "double", "deluxe", "suite", "triple", "family"],
      default: "single",
      required: true,
    },
    amenities: [String],
    bedType: {
      type: String,
      enum: ["single", "double", "queen", "king", "twin", "sofa-bed"],
      required: true,
      default: "single",
    },
    bedCount: { type: Number, default: 1 },

    // ✅ Add dimensions object here
    dimensions: {
      length: {
        type: Number,
        default: 0,
      }, // in feet or meters
      width: {
        type: Number,
        default: 0,
      },
      height: {
        type: Number,
        default: 0,
      },
      unit: {
        type: String,
        enum: ["ft", "m"],
        default: "ft",
      }, // optional
    },
    images: [{ secure_url: String, public_id: String }],
    videos: [{ secure_url: String, public_id: String }],
 //bathroom
    bathroomType: {
      type: String,
      enum: ["private", "shared", "ensuite", "external"],
      default: "private",
    },
    bathroomCount: { type: Number, default: 1 },
    distanceToBathroom: {
      value: { type: Number, default: 0 },
      unit: { type: String, enum: ["m", "ft"], default: "m" },
    },
    bathroomAmenities: [String],

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

roomSchema.virtual("Bookings", {
  ref: "Booking",
  localField: "_id",
  foreignField: "roomId",
});

// To include virtuals in JSON output
roomSchema.set("toObject", { virtuals: true });
roomSchema.set("toJSON", { virtuals: true });

export default mongoose.model("Room", roomSchema);
