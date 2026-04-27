import mongoose from "mongoose";

const partnerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth",
      required: true,
      unique: true,
    },

    panDetails: {
      panNumber: String,
      fullName: String,
      panType: String, // Individual | HUF | Company
      panStatus: String,
      verifiedAt: Date,
    },
    // Store GSTIN list returned from PAN-GST link API
    gstinList: [
      {
        gstin: String,
        status: String,
        state: String,
      },
    ],

    // razorpay: {
    //   contactId: String,
    //   fundAccountId: String,
    // },
    bankDetails: {
      accountHolderName: String,
      accountNumber: String,
      ifscCode: String,
      bankName: String,
    },
    isPanVerified:{ type: Boolean, default: false},  //for pan verification 
    isVerified: { type: Boolean, default: false }, //for  complete partner pan verification and  fund account
  },
  { timestamps: true }
);

const Partner = mongoose.model("Partner", partnerSchema);
export default Partner;
