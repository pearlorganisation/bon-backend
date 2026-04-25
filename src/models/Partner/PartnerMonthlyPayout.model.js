import mongoose from "mongoose";

const PartnerMonthlyPayoutSchema = new mongoose.Schema(
  {
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth",
      required: true,
      index: true,
    },

    /* ---------- PAYOUT PERIOD ---------- */
    payoutYear: {
      type: Number,
      required: true,
    },
    payoutMonth: {
      type: Number, // better to use number (1-12)
      required: true,
    },

    /* ---------- BOOKINGS LIST ---------- */
    bookings: [
      {
        bookingId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Booking",
          required: true,
        },
        partnerAmount: { type: Number, default: 0 },
        partner_gst: { type: Number, default: 0 },
        adminAmount: { type: Number, default: 0 },
        admin_gst: { type: Number, default: 0 },
      },
    ],

    partnerWallet: {
      payableAmount: { type: Number, default: 0 },
      status: {
        type: String,
        enum: ["pending", "processing", "paid", "failed"],
        default: "pending",
      },
      // razorpayPayoutId: String,
      // razorpayStatus: String,
      // paidAt: Date,
      // razorpayStatusDetail: String,
      invoiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Invoice",
      },
    },

    adminWallet: {
      receivableAmount: {
        type: Number,
        default: 0,
      },
      receivableGST: { type: Number, default: 0 },
      status: {
        type: String,
        enum: ["pending", "received"],
        default: "pending",
      },
    },
  },
  { timestamps: true },
);

/* ---------- PREVENT DUPLICATE PAYOUT ---------- */
PartnerMonthlyPayoutSchema.index(
  { partnerId: 1, payoutMonth: 1, payoutYear: 1 },
  { unique: true },
);

export default mongoose.model(
  "PartnerMonthlyPayout",
  PartnerMonthlyPayoutSchema,
);
