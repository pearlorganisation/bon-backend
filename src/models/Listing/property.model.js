import mongoose from "mongoose";

const propertySchema = new mongoose.Schema(
  {
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth",
      default: null,
    },

    subAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth",
      default: null,
    },

    name: { type: String, required: true },
    description: String,
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, required: true },
    pincode: String,
    propertyType: {
      type: String,
      trim: true,
      lowercase: true,
    },
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
    mapLink: String,
    rating: { type: Number, default: 0 },
    amenities: [String],

    policies: {
      checkInTime: { type: String, default: "2:00 PM" },
      checkOutTime: { type: String, default: "12:00 PM" },
      cancellationPolicy: [
        {
          daysBeforeCheckIn: {
            type: Number,
            required: true,
          },
          refundPercentage: {
            type: Number, // 0 – 100
            required: true,
            min: 0,
            max: 100,
          },
        },
      ],
      petPolicy: String,
      otherPolicies: String,
    },

    PartnerEmail: {
      type: String,
    },

    documentVerification: {
      GSTIN: {
        gstin: String,
        legalName: String,
        tradeName: String,
        constitutionOfBusiness: String,
        taxpayerType: String,
        gstStatus: String, //["ACTIVE", "INACTIVE"]  cashfree approved
        dateOfRegistration: String,
        natureOfBusinessActivities: [String],
        status: {
          type: String,
          enum: ["pending", "verified"], // cashfree approved
          default: "pending",
        },
        GSTIN_message: {
          type: String,
        },
      },

      PropertyDocuments: [
        {
          document_name: { type: String, trim: true, lowercase: true },
          secure_url: String,
          public_id: String,
        },
      ],
    },
    //df
    // ratingsAverage: {
    //   type: Number,
    //   default: 4.5,
    //   min: [1, "Rating must be above 1.0"],
    //   max: [5, "Rating must be below 5.0"],
    //   set: (val) => Math.round(val * 10) / 10,
    // },
    // ratingsQuantity: {
    //   type: Number,
    //   default: 0,
    // },

    childrenCharge: {
      age: Number,
      charge: { type: Number, require: true, default: 0 },
    },
    Images: [{ secure_url: String, public_id: String }],
    Videos: [{ secure_url: String, public_id: String }],

    paymentModes: {
      PAY_NOW: { type: Boolean, default: true },
      PAY_ON_ARRIVAL: { type: Boolean, default: true },
    },

    status: { type: String, enum: ["active", "inactive"], default: "active" },
    verified: {
      type: String,
      enum: ["pending", "under_review", "approved", "rejected"], //admin"approved" approved
      default: "pending",
    },
    AdminNote: { type: String },
    //     commissionPercentage: { type: Number, default: 10 },
  },
  { timestamps: true }
);

// 2dsphere index for geospatial queries
propertySchema.index({ geoLocation: "2dsphere" });

propertySchema.virtual("Rooms", {
  ref: "Room",
  localField: "_id",
  foreignField: "propertyId",
});

propertySchema.virtual("Bookings", {
  ref: "Booking",
  localField: "_id",
  foreignField: "propertyId",
});

// To include virtuals in JSON output
propertySchema.set("toJSON", { virtuals: true });
propertySchema.set("toObject", { virtuals: true });

propertySchema.pre("validate", function (next) {
  if (!this.partnerId && !this.subAdminId) {
    return next(new Error("Either partnerId or subAdminId is required"));
  }
  next();
});

export default mongoose.model("Property", propertySchema);
