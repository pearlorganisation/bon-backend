

import mongoose from "mongoose";

const partnerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth",
      required: true,
      unique: true,
    },
  

    businessLicense: String,
    address: String,
    bankDetails: {
      accountNumber: String,
      ifscCode: String,
      bankName: String,
    },
    listings: [
      {
        listingId: { type: mongoose.Schema.Types.ObjectId, ref: "Listing" },
      },
    ],
    isApproved: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Partner = mongoose.model("Partner", partnerSchema);
export default Partner;
