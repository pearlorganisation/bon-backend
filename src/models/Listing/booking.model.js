import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
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

    // total for entire booking
    totalPrice: { type: Number, required: true },

    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed"],
      default: "pending",
    },

    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "refunded"],
      default: "unpaid",
    },

    // number of rooms booked under this booking
    roomCount: { type: Number, default: 1 },
  },
  { timestamps: true }
);

const bookingRoomSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Booking",
    required: true,
  },

  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Room",
    required: true,
  },

  checkInDate: { type: Date, required: true },
  checkOutDate: { type: Date, required: true },

  guest: [ {
        name: {type: String, required:true},
        age: {type: String,required:true}
  }],

  price: { type: Number, required: true },

  status: {
    type: String,
    enum: ["reserved", "cancelled"],
    default: "reserved",
  },

}, { timestamps: true });



bookingSchema.virtual("booked-rooms",{
   ref: "BookingRoom",
   localField: "_id",
   foreignField: "bookingId"
});

export const BookingRoom= mongoose.model("BookingRoom", bookingRoomSchema);

export  const Booking= mongoose.model("Booking", bookingSchema);
