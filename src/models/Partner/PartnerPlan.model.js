import mongoose from "mongoose";

const PartnerPlanSchema = new mongoose.Schema(
  {
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth",
      required: true,
    },

    PlanType: {
      type: String,
      enum: ["COMMISSION", "SUBSCRIPTION"],
      required: true,
    },

    commissionPercentage: {
      type: Number,
    },

    subscriptionPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdminSubscriptionPlan",
      default:null
    },
    subscriptionPayment: {
      orderId: { type: String },
      paymentId: { type: String },
      totalAmount: Number,
      gstAmount : Number,
      gstRate: Number,
    },

    startDate: Date,
    endDate: Date,
    planStatus: {
      type: String,
      enum: ["INACTIVE", "ACTIVE", "UPCOMING", "EXPIRED"],
      required: true,
    },

    invoiceId: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "Invoice",
         default: null,
       },
  },
  { timestamps: true }
);

// Only one ACTIVE plan
PartnerPlanSchema.index(
  { partnerId: 1 },
  {
    unique: true,
    partialFilterExpression: { planStatus: "ACTIVE" },
    name: "unique_active_plan_per_partner", // optional but recommended
  }
);

PartnerPlanSchema.index(
  { partnerId: 1 },
  {
    unique: true,
    partialFilterExpression: { planStatus: "UPCOMING" },
    name: "unique_upcoming_plan_per_partner", // helps debugging
  }
);

const PartnerPlan = mongoose.model("PartnerPlan", PartnerPlanSchema);

export default PartnerPlan;
