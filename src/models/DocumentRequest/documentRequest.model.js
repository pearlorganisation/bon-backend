import mongoose from "mongoose";

const documentRequestSchema = new mongoose.Schema(
  {
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth",
      required: true,
    },

    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },

    documents: [
      {
        type: String,
        enum: [
          "property_listing_terms",
          "commission_payment_policy",
          "terms_of_use",
          "hotel_partner_agreement",
        ],
        required: true,
      },
    ],

    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "expired"],
      default: "pending",
    },

    adminMessage: String,

    expiryTime: Date, // Set by admin

    viewedAt: Date, // When partner viewed
  },
  { timestamps: true }
);

export default mongoose.model("DocumentRequest", documentRequestSchema);
