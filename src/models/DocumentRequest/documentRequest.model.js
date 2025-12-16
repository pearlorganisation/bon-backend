import mongoose from "mongoose";


/* --------------------------------------------
    DOCUMENT TYPE SCHEMA
-------------------------------------------- */

const DocumentTypeSchema = new mongoose.Schema(
  { 

     name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
      // example: "property listing terms"
    },

    description: String,


    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth", // admin
      required: true,
    },
  },
  { timestamps: true }
);


/* --------------------------------------------
    DOCUMENT SCHEMA
-------------------------------------------- */

const DocumentSchema = new mongoose.Schema(
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
    documentTypeId:  {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DocumentType",
      required: true,
    },
    createdBy : {
         type: mongoose.Schema.Types.ObjectId,
         ref: "Auth",  //sub-admins
         required:true
    },

    isActive: { type: Boolean, default: false },
    isDeleted: {type: Boolean, default: true}
  },
  { timestamps: true }
);

DocumentSchema.index(
  {
    country: 1,
    state: 1,
    documentTypeId: 1,
  },
  {
    unique: true,
  }
);


/* --------------------------------------------
   PARTNER DOCUMENT ACCESS SCHEMA
-------------------------------------------- */

const PartnerDocumentAccessSchema = new mongoose.Schema(
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
      type: mongoose.Schema.Types.ObjectId,
      ref: "DocumentType",
      required: true,
    },
    ],

    assignedDocuments: [
      {
        documentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Document",
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
    requestedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

/* --------------------------------------------
   EXPORT MODELS IN A SINGLE FILE
-------------------------------------------- */
const DocumentType = 
mongoose.models.DocumentType ||
 mongoose.model("DocumentType",DocumentTypeSchema);

const Document =
  mongoose.models.Document ||
  mongoose.model("Document", DocumentSchema);

const PartnerDocumentAccess =
  mongoose.models.PartnerDocumentAccess ||
  mongoose.model("PartnerDocumentAccess", PartnerDocumentAccessSchema);

export {DocumentType, Document, PartnerDocumentAccess };
