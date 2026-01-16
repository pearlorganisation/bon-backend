const AdminSubscriptionPlanSchema = new mongoose.Schema(
  {
    name: String,
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
      prioritySupport: {
        type: Boolean,
        default: false,
      },
      maxPropertiesAllowed: {
        type: Number,
        default: 1,
      },
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
  },
  { timestamps: true }
);
