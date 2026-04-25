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
        "BOOKING_INVOICE", //  for partner and custoemer invoice
        "PARTNER_PLAN_INVOICE", //  commission and subscription
        "PAYOUT_STATEMENT_INVOICE", // monthly payout to partner
      ],
      required: true,
    },

    /* ---------------- DOCUMENT ---------------- */

    pdfUrl: String, 
    pdfUrl2: {
      type: String,
      validate: {
        validator: function (value) {
          // If invoiceType is NOT BOOKING_INVOICE, pdfUrl2 must be empty/undefined
          if (this.invoiceType !== "BOOKING_INVOICE" && value) {
            return false;
          }
          return true;
        },
        message: "pdfUrl2 is only allowed for BOOKING_INVOICE type.",
      },
    }, //only  in case for BOOKING_INVOICE  ->partner booking invoice pdf

    issuedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Invoice", invoiceSchema);
