import mongoose from "mongoose";

/* --------------------------------------------
   ADMIN DOCUMENT SCHEMA
-------------------------------------------- */

const adminDocumentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    documentUrl: { type: String, required: true },
    public_id: { type: String },

    // Location Based Filters
    country: { type: String, required: true },
    state: { type: String, required: true },
    city: { type: String },

    // UPDATED: Added specific enums
    documentType: {
      type: String,
      enum: [
        "property_listing_terms",
        "commission_payment_policy",
        "terms_of_use",
        "hotel_partner_agreement",
      ],
      required: true,
    },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

/* --------------------------------------------
   PROPERTY DOCUMENT ACCESS SCHEMA
-------------------------------------------- */

const propertyDocumentAccessSchema = new mongoose.Schema(
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

    // UPDATED: Store which documents were requested
    requestedDocumentTypes: [
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

    assignedDocuments: [
      {
        documentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "AdminDocument",
          required: true,
        },
        assignedAt: { type: Date, default: Date.now },
      },
    ],

    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "expired"],
      default: "pending",
    },

    accessStartDate: { type: Date },
    accessEndDate: { type: Date },

    adminNote: { type: String },
  },
  { timestamps: true }
);

/* --------------------------------------------
   EXPORT MODELS IN A SINGLE FILE
-------------------------------------------- */

const AdminDocument =
  mongoose.models.AdminDocument ||
  mongoose.model("AdminDocument", adminDocumentSchema);

const PropertyDocumentAccess =
  mongoose.models.PropertyDocumentAccess ||
  mongoose.model("PropertyDocumentAccess", propertyDocumentAccessSchema);

export { AdminDocument, PropertyDocumentAccess };
