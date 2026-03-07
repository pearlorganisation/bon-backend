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
        room_gst: {
          gst_rate: Number,
          gst_amount: Number,
        },
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
      children: [{ age: Number }],
    },
    // Total price (sum of all room subtotals + taxes/fees + gst)
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    // Breakdown of pricing for transparency
    priceBreakdown: {
      basePrice: { type: Number, default: 0 },
      discountAmount: { type: Number, default: 0 },
      // taxes: { type: Number, default: 0 },
      extraServicesFee: { type: Number, default: 0 }, // e.g., service fees, cleaning fees
      partnerPlanId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PartnerPlan",
        required: true,
      },
      gst_amount: { type: Number, default: 0 },
    },
    paymentMode: {
      type: String,
      enum: ["PAY_NOW", "PAY_ON_ARRIVAL"],
      required: true,   
      default: "PAY_NOW",
    },
    //paymwnt object only  for PAY_NOW
    payment: {
      razorpayOrderId: { type: String, default: null },
      razorpayPaymentId: { type: String },
      amount: { type: Number },
      currency: { type: String, default: "INR" },
      paymentMethod: { type: String },
    },
    paymentStatus: {
      type: String,
      enum: [
        "pending",
        "paid",
        "failed",
        "refund_pending",
        "refunded",
        "refund_failed",
        "no_refund",
      ],
      default: "pending",
    },
    // Booking status for lifecycle management
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "cancelled",
        "expired",
        "checkIn",
        "no-show",
        "auto_settled",
      ],
      default: "pending",
    },
    // Cancellation details if applicable
    cancellation: {
      cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Auth",
      },
      cancellationDate: { type: Date },
      refundAmount: { type: Number, default: 0 },
      razorpayRefundId: { type: String },
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
      sparse: true, // allows null for pending bookings
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
    },
  },
  { timestamps: true }
);

// Indexes for efficient queries (e.g., by dates for availability checks)
bookingSchema.index({ propertyId: 1 });
bookingSchema.index({ checkInDate: 1, checkOutDate: 1 });
bookingSchema.index({ userId: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ confirmationCode: 1 });

// Virtual for calculating number of nights

bookingSchema.pre("save", function (next) {
  if (this.checkOutDate <= this.checkInDate) {
    return next(new Error("Check-out date must be after check-in date"));
  }
  next();
});

const Booking = new mongoose.model("Booking", bookingSchema);

export default Booking;
