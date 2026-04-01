import mongoose from "mongoose";

const AdminSubscriptionPlanSchema = new mongoose.Schema(
  {
    name: { type: String, unique: true, trim: true, uppercase: true },
    price: Number,
    durationDays: { type: Number, default: 30 },
    isActive: { type: Boolean, default: true },
            
    benefits: {
      searchBoost: {
        type: Number,
        default: 0, // higher = better ranking
      },
      isFeatured: {
        type: Boolean,
        default: false,
      },
      featuredLabel: {
        type: String, // "Top Property", "Recommended"
      },
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
  },
  { timestamps: true }
);

const AdminSubscriptionPlan = mongoose.model(
  "AdminSubscriptionPlan",
  AdminSubscriptionPlanSchema
);

export default AdminSubscriptionPlan;
