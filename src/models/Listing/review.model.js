import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth",
      required: true,
    },
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      maxLength: 1000,
    },
    images: [
      {
        secure_url: String,
        public_id: String,
      },
    ],

    partnerReply: {
      comment: String,
      createdAt: Date,
    },
  },
  { timestamps: true }
);

reviewSchema.statics.calcAverageRatings = async function (propertyId) {
  const stats = await this.aggregate([
    {
      $match: { propertyId: propertyId },
    },
    {
      $group: {
        _id: "$propertyId",
        nRating: { $sum: 1 },
        avgRating: { $avg: "$rating" },
      },
    },
  ]);

  // Note: Ensure your Property model has 'ratingsQuantity' and 'ratingsAverage' fields
  if (stats.length > 0) {
    await mongoose.model("Property").findByIdAndUpdate(propertyId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: Math.round(stats[0].avgRating * 10) / 10, // Round to 1 decimal
    });
  } else {
    await mongoose.model("Property").findByIdAndUpdate(propertyId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5, // Default or 0
    });
  }
};

// Call calcAverageRatings after save
reviewSchema.post("save", function () {
  this.constructor.calcAverageRatings(this.propertyId);
});

// Call calcAverageRatings after delete (if you allow deleting reviews)
reviewSchema.post(/^findOneAnd/, async function (doc) {
  if (doc) {
    await doc.constructor.calcAverageRatings(doc.propertyId);
  }
});

export default mongoose.model("Review", reviewSchema);
