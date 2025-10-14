import mongoose from 'mongoose';

   
          
const CustomerSchema = new mongoose.Schema(

  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth",
      required: true,
    },
    


    bookings: [
      {
        bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
        status: { type: String, enum: ["CONFIRMED", "CANCELLED"], default: "CONFIRMED" },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("Customer", CustomerSchema);

          
