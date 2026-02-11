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
      type: String,
      required: true,
    },

    /* ---------- WALLET DISTRIBUTION ---------- */
    partnerWallet: {
      payableAmount: {
        type: Number,
        default: 0,
      },
      status: {
        type: String,
        enum: ["pending", "paid", "failed"],
      },
    },

    adminWallet: {
      receivableAmount: {
        type: Number,
        default: 0,
      },
      status: {
        type: String,
        enum: ["pending", "paid", "failed"],
      },
    },
    bookings: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Booking",
        required: true,
      },
    ],
  },
  { timestamps: true }
);

/* ---------- PREVENT DUPLICATE PAYOUT ---------- */
PartnerMonthlyPayoutSchema.index(
  { partnerId: 1, payoutMonth: 1, payoutYear: 1 },
  { unique: true }
);

const PartnerMonthlyPayout = mongoose.model(
  "PartnerMonthlyPayout",
  PartnerMonthlyPayoutSchema
);

export default PartnerMonthlyPayout;
