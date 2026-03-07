import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
    },

    invoiceType: {
      type: String,
      enum: [
        "CUSTOMER_INVOICE", // pay now customer invoice
        "COMMISSION_INVOICE", // commission per booking
        "PAYOUT_STATEMENT", // monthly payout to partner
      ],
      required: true,
    },


    /* ---------------- DOCUMENT ---------------- */

    pdfUrl: String,

    issuedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Invoice", invoiceSchema);
