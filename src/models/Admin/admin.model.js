import mongoose from "mongoose";

const AdminSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth",
      required: true,
      unique: true,
    },

    commission: {
      min: { type: Number, default: 10 },
      max: { type: Number, default: 50 },
    },

    //  Room GST Slabs (dynamic instead of hardcoded)
    roomGSTSlabs: [
      {
        upto: { type: Number, required: true }, // amount limit
        rate: { type: Number, required: true }, // GST %
      },
    ],

    // gst which admin pay to govt for services like on admin booking commssion  and on subscription plan
    gstOnServices: {
      type: Number,
      default: 18,
    },

    GSTIN: {
      type: String,
      default: "N/A",
    },
    RAZORPAY_CONFIG: {
      RAZORPAY_KEY_ID: String,
      RAZORPAY_KEY_SECRET : String,
      RAZORPAY_WEBHOOK_SECRET: String,
    },
  },
  { timestamps: true }
);

const Admin = mongoose.model("Admin", AdminSchema);

export default Admin;
