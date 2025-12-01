import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth",
      required: true,
    },
    // Link to the specific Room
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    // Link to Property (Denormalized for faster queries on Property level)
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },
    // Useful to identify booking easily in UI
    bookingId: {
      type: String,
      unique: true,
      required: true, // Generate this in controller (e.g., 'BK-12345')
    },

    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },

    guestDetails: {
      adults: { type: Number, default: 1 },
      children: { type: Number, default: 0 },
      // Optional: Store names if required
    },

    // Financials
    pricePerNight: { type: Number, required: true },
    totalNights: { type: Number, required: true },
    totalAmount: { type: Number, required: true }, // (price * nights) - discount
    currency: { type: String, default: "INR" },

    paymentInfo: {
      id: { type: String },
      status: {
        type: String,
        enum: ["pending", "paid", "failed", "refunded"],
        default: "pending",
      },
      method: { type: String }, // e.g., 'razorpay', 'stripe', 'cash'
    },

    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "checked_in",
        "checked_out",
        "cancelled",
        "rejected",
      ],
      default: "pending",
    },

    cancelledBy: {
      type: String,
      enum: ["customer", "partner", "admin", null],
      default: null,
    },
    cancellationReason: { type: String },

    specialRequests: { type: String },
  },
  { timestamps: true }
);

// Prevent overlapping bookings at the database level (Optional constraint, but Controller logic is better)
bookingSchema.index({ roomId: 1, checkIn: 1, checkOut: 1, status: 1 });

export default mongoose.model("Booking", bookingSchema);
