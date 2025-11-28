import { Booking, BookingRoom } from "../models/bookingSchema.js";
import Room from "../models/room.model.js";
import Property from "../models/property.model.js";
import asyncHandler from "../utils/asyncHandler.js";

// post request to book  room in simgle property
// {
//   "userId": "userid",
//   "propertyId": "propertyid",
//   "rooms": [
//     {
//       "roomId": "room-id-1",
//       "checkInDate": "2025-01-10",
//       "checkOutDate": "2025-01-13",
//       "guest": [
//         { "name": "John", "age": 30 }
//       ]
//     },
//     {
//       "roomId": "room-id-2",
//       "checkInDate": "2025-01-11",
//       "checkOutDate": "2025-01-13",
//       "guest": [
//         { "name": "Alice", "age": 25 }
//       ]
//     }
//   ]
// }

// ------------------------
// Create Multi-Room Booking
// ------------------------
export const createBooking = asyncHandler(async (req, res, next) => {
  const { userId, propertyId, rooms } = req.body;

  // ---------------------
  // 1. Basic Validations
  // ---------------------
  if (!userId || !propertyId || !Array.isArray(rooms) || rooms.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields or rooms array",
    });
  }

  // Validate property exists
  const property = await Property.findById(propertyId);
  if (!property) {
    return res.status(404).json({
      success: false,
      message: "Property not found",
    });
  }

  let totalPrice = 0;
  const bookingRoomDocs = [];

  // --------------------------
  // 2. Process each room entry
  // --------------------------
  for (const r of rooms) {
    const { roomId, checkInDate, checkOutDate, guest } = r;

    if (!roomId || !checkInDate || !checkOutDate) {
      return res.status(400).json({
        success: false,
        message: "roomId, checkInDate & checkOutDate required",
      });
    }

    // Validate room exists
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: `Room not found: ${roomId}`,
      });
    }

    // Convert to Date object
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    if (checkOut <= checkIn) {
      return res.status(400).json({
        success: false,
        message: "checkOutDate must be greater than checkInDate",
      });
    }

    // ----------------------------------------
    // 3. Prevent Double Booking (date overlap)
    // ----------------------------------------
    const overlappingBooking = await BookingRoom.findOne({
      roomId,
      status: "reserved",
      checkInDate: { $lt: checkOut },
      checkOutDate: { $gt: checkIn },
    });

    if (overlappingBooking) {
      return res.status(409).json({
        success: false,
        message: `Room ${room.name} is already booked for selected dates`,
      });
    }

    // -----------------------
    // 4. Calculate room price
    // -----------------------
    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

    let price = room.pricePerNight;
    if (room.discount > 0) {
      price -= (room.discount / 100) * price; // percentage discount
    }

    const finalPrice = nights * price;
    totalPrice += finalPrice;

    // Create BookingRoom doc (not saved yet)
    bookingRoomDocs.push({
      roomId,
      checkInDate,
      checkOutDate,
      guest,
      price: finalPrice,
    });
  }

  // ---------------------------
  // 5. Create Master Booking
  // ---------------------------
  const booking = await Booking.create({
    userId,
    propertyId,
    totalPrice,
    roomCount: rooms.length,
    status: "pending",
    paymentStatus: "unpaid",
  });

  // -------------------------------------
  // 6. Create BookingRoom entries (child)
  // -------------------------------------
  for (const roomData of bookingRoomDocs) {
    roomData.bookingId = booking._id;
    await BookingRoom.create(roomData);
  }

  return res.status(201).json({
    success: true,
    message: "Booking created successfully",
    bookingId: booking._id,
    totalPrice,
  });
});
