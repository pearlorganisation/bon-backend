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
    mapLink: String,
    rating: { type: Number, default: 0 },
    amenities: [String],

    policies: {
      checkInTime: String,
      checkOutTime: String,
      cancellationPolicy: String,
      petPolicy: String,
      otherPolicies: String,
    },

    documentVerification: {
      gst: {
        number: String,
        status: {
          type: String,
          enum: ["pending", "verified"],
          default: "pending",
        },
      },
      pan: {
        number: String,
        status: {
          type: String,
          enum: ["pending", "verified"],
          default: "pending",
        },
      },
      aadhaar: {
        number: String,
        status: {
          type: String,
          enum: ["pending", "verified"],
          default: "pending",
        },
      },
      passport: {
        number: String,
        status: {
          type: String,
          enum: ["pending", "verified"],
          default: "pending",
        },
      },
      license: {
        number: String,
        status: {
          type: String,
          enum: ["pending", "verified"],
          default: "pending",
        },
      },
      hotelAgreement: {
        documentUrl: String,
        status: {
          type: String,
          enum: ["pending", "verified"],
          default: "pending",
        },
      },
      kycDocuments: {
        documentUrl: String,
        status: {
          type: String,
          enum: ["pending", "verified"],
          default: "pending",
        },
      },
      email: {
        emailAddress: String,
        status: {
          type: String,
          enum: ["pending", "verified"],
          default: "pending",
        },
      },
    },

    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, "Rating must be above 1.0"],
      max: [5, "Rating must be below 5.0"],
      set: (val) => Math.round(val * 10) / 10,
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },

    propertyApproval: {
      status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
      },
      termsAndConditions: {
        type: String,
        enum: ["pending", "accepted"],
        default: "pending",
      },
      invoiceStatus: {
        type: String,
        enum: ["unpaid", "paid"],
        default: "unpaid",
      },
    },

    paymentDetails: {
      bankName: String,
      accountNumber: String,
      ifscCode: String,
      accountHolderName: String,
      branchName: String,
    },

    checkIn: { type: Date },
    checkOut: { type: Date },
    Images: [{ secure_url: String, public_id: String }],
    Videos: [{ secure_url: String, public_id: String }],
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    verified: {
      type: String,
      enum: ["pending", "under_review", "approved", "rejected"],
      default: "pending",
    },
    GSTIN: { type: String },
    CIN: { type: String },
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

export default mongoose.model("Property", propertySchema);
