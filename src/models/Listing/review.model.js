import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      unique: true, // one review per booking
    },

    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },
    overallRating: {
      type: Number,
      min: 1,
      max: 5,
    },

    review: {
      type: String,
      trim: true,
    },

    rooms: [
      {
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
      },
    ],
  },
  { timestamps: true }
);


reviewSchema.pre("save", function (next) {
  if (!this.rooms || this.rooms.length === 0) {
    return next(new Error("At least one room rating is required"));
  }

  const total = this.rooms.reduce((sum, r) => sum + r.rating, 0);

  this.overallRating = total / this.rooms.length;

  next();
});
reviewSchema.index({ propertyId: 1 });
const Review = mongoose.model("Review",reviewSchema);

export default Review;