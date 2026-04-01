import mongoose from "mongoose";

const tourSchema = new mongoose.Schema(
  {
    /* ---------------- BASIC ---------------- */
    tourName: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    description: String,

    /* ---------------- DESTINATION ---------------- */
    destinationCovered: {
      type: String,
      required: true,
    },

    tourType: {
      type: String, // adventure, honeymoon, family
    },

    /* ---------------- DURATION ---------------- */
    duration: {
      days: Number,
      nights: Number,
    },

    /* ---------------- PRICING ---------------- */
    price: {
      type: Number,
      required: true,
      min: 0,
    },

    discountPrice: Number,

    /* ---------------- CONTENT ---------------- */
    highlights: [String],

    /* ---------------- IMAGES ---------------- */
    coverImage: {
      secure_url: String,
      public_id: String,
    },

    bannerText: String, // "Limited Offer", "Trending"

    priority: {
      type: Number,
      default: 0,
    },

    /* ---------------- STATUS ---------------- */
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    /* ---------------- CONTACT ---------------- */
    contact: {
      email: {
        type: String,
        lowercase: true,
        trim: true,
      },
      phone: {
        type: String,
      },
    },
  },
  { timestamps: true }
);

export default mongoose.model("Tour", tourSchema);
