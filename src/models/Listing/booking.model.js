import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    // Reference to the user making the booking (assuming an 'Auth' or 'User' model exists)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth", // Adjust to your user model name, e.g., "User"
      required: true,
    },
    // Reference to the property (all rooms must belong to this property)
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },
    // Array of rooms booked in this single booking (supports multiple room types and quantities)
    rooms: [
      {
        roomId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Room",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          default: 1,
        },
        pricePerNight: { type: Number, default: 0 },
        discount: { type: Number, default: 0 },
        extraServices: [
          {
            name: String,
            fee: { type: Number, default: 0 },
          },
        ],
      },
    ],
    // Booking dates (applied to all rooms in the booking)
    checkInDate: {
      type: Date,
      required: true,
    },
    checkOutDate: {
      type: Date,
      required: true,
    },
    // Total number of guests (sum across all rooms, validated against capacities)
    numberOfGuests: {
      adults: { type: Number },
      childern: [{ age: Number, }],
    },
    // Total price (sum of all room subtotals + taxes/fees)
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    // Breakdown of pricing for transparency
    priceBreakdown: {
      basePrice: { type: Number, default: 0 },
      discountAmount: { type: Number, default: 0 },
      taxes: { type: Number, default: 0 },
      extraServicesFee: { type: Number, default: 0 }, // e.g., service fees, cleaning fees
      platformFee: {type:Number},
      childrenCharge:{type: Number}
    },
    // Payment information
    paymentMethod: {
      type: String,
      enum: [
        "credit_card",
        "debit_card",
        "paypal",
        "bank_transfer",
        "cash_on_arrival",
        "other",
      ],
      default: "credit_card",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "refunded", "failed"],
      default: "pending",
    },
    transactionId: {
      type: String, // From payment gateway
    },
    // Booking status for lifecycle management
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending",
    },
    // Cancellation details if applicable
    cancellation: {
      cancelledBy: {
        type: String,
        enum: ["user", "partner"],
      },
      cancellationDate: { type: Date },
      refundAmount: { type: Number, default: 0 },
      reason: { type: String },
    },
    // Guest details (for multiple guests or additional info)
    primaryGuestDetails: {
      fullName: { type: String, required: true },
      email: { type: String, trim: true, lowercase: true },
      phone: { type: String, required: true },
      address: { type: String, trim: true },
      city: { type: String, trim: true },
      country: { type: String, trim: true },
    },
    // Special requests from the user
    specialRequests: { type: String },
    // Review reference (post-stay)
    // Invoice or confirmation code
    confirmationCode: {
      type: String,
      unique: true,
    },
  },
  { timestamps: true }
);

// Indexes for efficient queries (e.g., by dates for availability checks)
bookingSchema.index({ propertyId: 1 });
bookingSchema.index({ checkInDate: 1, checkOutDate: 1 });
bookingSchema.index({ userId: 1 });
bookingSchema.index({ status: 1 });

// Virtual for calculating number of nights
bookingSchema.virtual("numberOfNights").get(function () {
  if (this.checkInDate && this.checkOutDate) {
    const diffTime = Math.abs(this.checkOutDate - this.checkInDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Days between dates
  }
  return 0;
});

bookingSchema.pre("save", function (next) {
  if (this.checkOutDate <= this.checkInDate) {
    return next(new Error("Check-out date must be after check-in date"));
  }
  next();
});

const Booking = new mongoose.model("Booking", bookingSchema);

export default Booking;
