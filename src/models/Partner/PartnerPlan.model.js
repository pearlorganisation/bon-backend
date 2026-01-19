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

    commissionPercent: {
      type: Number,
    },

    subscriptionPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubscriptionPlan",
    },
    startDate: Date,
    endDate: Date,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

PartnerPlanSchema.createIndex({ partnerId: 1, isActive: 1 });

const PartnerPlan = mongoose.model("PartnerPlan", PartnerPlanSchema);

export default PartnerPlan;
