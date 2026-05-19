import mongoose from "mongoose";

const propertyAgreementDocSchema = new mongoose.Schema({
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

  HotelPartnerAgreement: {
    url: String,
    viewTime: Date,
    isRequested: {
      type: String,
      enum: ["send-request", "requested", "approved", "view"],
      default: "send-request",
    },
  },
  PropertyListingTerm: {
    viewTime: Date,
    isRequested: {
      type: String,
      enum: ["send-request", "requested", "approved", "view"],
      default: "send-request",
    },
  },
  CommissionAndPaymentPolicy: {
    viewTime: Date,
    isRequested: {
      type: String,
      enum: ["send-request", "requested", "approved", "view"],
      default: "send-request",
    },
  },
  TermsOfUse: {
    viewTime: Date,
    isRequested: {
      type: String,
      enum: ["send-request", "requested", "approved", "view"],
      default: "send-request",
    },
  },
});

const propertyAgreementDoc = mongoose.model(
  "propertyAgreementDoc",
  propertyAgreementDocSchema
);

export default propertyAgreementDoc;
