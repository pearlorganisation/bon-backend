import Booking from "../../models/Listing/booking.model.js";
import Room from "../../models/Listing/room.model.js";
import Property from "../../models/Listing/property.model.js";
import asyncHandler from "../../middleware/asyncHandler.js";
import { sendEmail } from "../../utils/mail/mailer.js";
import CustomError from "../../utils/error/customError.js";
import mongoose from "mongoose";
import { check } from "express-validator";
import successResponse from "../../utils/error/successResponse.js";
import { razorpay } from "../../config/razorpayConfig.js";
import crypto from "crypto";
// const generateBookingId = () => {
//   return `BK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
// };

// export const createBooking = async (req, res) => {
//   try {
//     const { roomId, checkIn, checkOut, guestDetails } = req.body;
//     const userId = req.user._id;

//     // 1️⃣ Validate required fields
//     if (!roomId || !checkIn || !checkOut) {
//       throw new Error("Room ID, Check-in, and Check-out dates are required.");
//     }

//     const start = new Date(checkIn);
//     const end = new Date(checkOut);
//     const now = new Date();
//     now.setHours(0, 0, 0, 0);

//     // 2️⃣ Validate dates
//     if (isNaN(start.getTime()) || isNaN(end.getTime())) {
//       throw new Error("Invalid date format.");
//     }
//     if (start < now) {
//       throw new Error("Check-in date cannot be in the past.");
//     }
//     if (end <= start) {
//       throw new Error("Check-out must be after check-in.");
//     }

//     // 3️⃣ Fetch room with populated property
//     const room = await Room.findById(roomId).populate("propertyId");

//     if (!room) throw new Error("Room not found.");
//     if (!room.propertyId)
//       throw new Error("This room is not linked to a valid property.");
//     if (room.propertyId.status !== "active")
//       throw new Error("Property is currently inactive.");

//     // 4️⃣ Validate guest count
//     const guests = guestDetails || req.body.guests || {};
//     const totalGuests =
//       (Number(guests.adults) || 1) + (Number(guests.children) || 0);

//     if (totalGuests > room.capacity) {
//       throw new Error(`Room capacity exceeded. Max allowed: ${room.capacity}`);
//     }

//     // 5️⃣ Check for existing bookings
//     const existingBooking = await Booking.findOne({
//       roomId,
//       status: { $in: ["confirmed", "pending", "checked_in"] },
//       $or: [{ checkIn: { $lt: end }, checkOut: { $gt: start } }],
//     });

//     if (existingBooking) {
//       throw new Error("Room is already booked for these dates.");
//     }

//     // 6️⃣ Check for blocked dates
//     if (room.blockedDates && room.blockedDates.length > 0) {
//       const isBlocked = room.blockedDates.some((block) => {
//         const blockStart = new Date(block.startDate);
//         const blockEnd = new Date(block.endDate);
//         return start < blockEnd && end > blockStart;
//       });
//       if (isBlocked) {
//         throw new Error(
//           "Room is under maintenance or blocked for these dates."
//         );
//       }
//     }

//     // 7️⃣ Calculate price
//     const oneDay = 24 * 60 * 60 * 1000;
//     const nights = Math.max(1, Math.round((end - start) / oneDay));
//     let pricePerNight = room.pricePerNight;

//     if (room.discount && room.discount > 0) {
//       pricePerNight = pricePerNight - (pricePerNight * room.discount) / 100;
//     }

//     const totalAmount = pricePerNight * nights;

//     // 8️⃣ Create and save booking
//     const newBooking = new Booking({
//       userId,
//       roomId,
//       propertyId: room.propertyId._id,
//       bookingId: generateBookingId(),
//       checkIn: start,
//       checkOut: end,
//       guestDetails: {
//         adults: guests.adults || 1,
//         children: guests.children || 0,
//       },
//       pricePerNight,
//       totalNights: nights,
//       totalAmount,
//       status: "confirmed", // Or 'pending' if using payment gateway
//     });

//     await newBooking.save();

//     // 9️⃣ Send response
//     res.status(201).json({
//       success: true,
//       message: "Room booked successfully",
//       booking: newBooking,
//     });
//   } catch (error) {
//     console.error("Booking error:", error);
//     res.status(400).json({ success: false, message: error.message });
//   }
// };

// export const getMyBookings = async (req, res) => {
//   try {
//     const bookings = await Booking.find({ userId: req.user._id })
//       .populate({
//         path: "propertyId",
//         select: "name city images address",
//       })
//       .populate({
//         path: "roomId",
//         select: "name type images",
//       })
//       .sort({ createdAt: -1 });

//     res.status(200).json({ success: true, count: bookings.length, bookings });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// export const getBookingDetail = async (req, res) => {
//   try {
//     const { bookingId } = req.params;

//     const bookingDetail = await Booking.findOne({
//       _id: bookingId,
//       userId: req.user._id,
//     })
//       .populate({
//         path: "userId",
//         select: "name email phoneNumber createdAt profileImageUrl", // ✅ FIXED
//       })
//       .populate({
//         path: "propertyId",
//         select: "name city images address",
//       })
//       .populate({
//         path: "roomId",
//         select: "name type images pricePerNight", // ❌ profileImageUrl removed (room doesn't have it)
//       });

//     if (!bookingDetail) {
//       return res.status(404).json({ message: "Booking not found" });
//     }

//     // Booking timeline
//     const bookingTimeline = [
//       { title: "Booking created", date: bookingDetail.createdAt },
//       {
//         title: "Payment completed",
//         date: bookingDetail.paymentCompletedAt || null,
//       },
//       {
//         title: "Hotel confirmed",
//         date: bookingDetail.hotelConfirmedAt || null,
//       },
//       { title: "User check-in", date: bookingDetail.checkIn },
//       { title: "User check-out", date: bookingDetail.checkOut },
//     ];

//     // Final formatted response
//     const formattedBooking = {
//       bookingId: bookingDetail._id,
//       checkIn: bookingDetail.checkIn,
//       checkOut: bookingDetail.checkOut,
//       guestDetails: bookingDetail.guestDetails || {},
//       totalAmount: bookingDetail.totalAmount,
//       tax: bookingDetail.tax || 0,
//       status: bookingDetail.status,

//       property: {
//         name: bookingDetail.propertyId?.name || "N/A",
//         city: bookingDetail.propertyId?.city || "N/A",
//         address: bookingDetail.propertyId?.address || "N/A",
//         images: bookingDetail.propertyId?.images || [],
//       },

//       room: {
//         name: bookingDetail.roomId?.name || "N/A",
//         type: bookingDetail.roomId?.type || "N/A",
//         images: bookingDetail.roomId?.images || [],
//         pricePerNight: bookingDetail.roomId?.pricePerNight || 0,
//       },

//       user: {
//         name: bookingDetail.userId?.name || "Unknown",
//         email: bookingDetail.userId?.email || "N/A",
//         phone: bookingDetail.userId?.phoneNumber || "N/A", // ✅ FIXED
//         registered: bookingDetail.userId?.createdAt || null,
//         profileImageUrl: bookingDetail.userId?.profileImageUrl || null, // ✅ FIXED
//       },

//       paymentDetails: {
//         amount: bookingDetail.amount || 0,
//         tax: bookingDetail.tax || 0,
//         total: bookingDetail.totalAmount || 0,
//       },

//       bookingTimeline,
//     };

//     res.status(200).json({ success: true, bookingDetail: formattedBooking });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Server error", error });
//   }
// };

// export const getPartnerBookings = async (req, res) => {
//   try {
//     const partnerId = req.user._id;
//     const properties = await Property.find({ partnerId }).select("_id");
//     if (!properties.length) {
//       return res.status(200).json({ success: true, bookings: [] });
//     }
//     const propertyIds = properties.map((p) => p._id);
//     const bookings = await Booking.find({ propertyId: { $in: propertyIds } })
//       .populate("userId", "name email phone")
//       .populate("roomId", "name type")
//       .populate("propertyId", "name city")
//       .sort({ createdAt: -1 });

//     res.status(200).json({ success: true, count: bookings.length, bookings });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// export const getPartnerBookingByProperty = async (req, res) => {
//   try {
//     const partnerId = req.user._id;
//     const propertyId = req.params.propertyId;

//     const property = await Property.findOne({
//       _id: propertyId,
//       partnerId: partnerId,
//     });

//     if (!property) {
//       return res.status(404).json({
//         success: false,
//         message: "Property not found or not assigned to this partner",
//       });
//     }

//     const bookings = await Booking.find({ propertyId })
//       .populate("userId", "name email phone")
//       .populate("roomId", "name type images")
//       .populate("propertyId", "name city address")
//       .sort({ createdAt: -1 });

//     return res.status(200).json({
//       success: true,
//       count: bookings.length,
//       bookings,
//     });
//   } catch (err) {
//     return res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

// // ==========================================
// // 4. Cancel Booking
// // ==========================================
// export const cancelBooking = async (req, res) => {
//   try {
//     const { bookingId } = req.params;
//     const { reason } = req.body;
//     const userId = req.user._id;
//     const role = req.user.role;

//     const booking = await Booking.findById(bookingId).populate("propertyId");

//     if (!booking) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Booking not found" });
//     }

//     // Authorization Check
//     let isAuthorized = false;

//     // 1. User owns the booking
//     if (role === "user" && booking.userId.toString() === userId.toString()) {
//       isAuthorized = true;
//     }
//     // 2. Partner owns the property
//     else if (
//       role === "partner" &&
//       booking.propertyId.partnerId.toString() === userId.toString()
//     ) {
//       isAuthorized = true;
//     }
//     // 3. Admin overrides
//     else if (role === "admin") {
//       isAuthorized = true;
//     }

//     if (!isAuthorized) {
//       return res.status(403).json({
//         success: false,
//         message: "You are not authorized to cancel this booking.",
//       });
//     }

//     // Status Check
//     if (["cancelled", "checked_out", "rejected"].includes(booking.status)) {
//       return res.status(400).json({
//         success: false,
//         message: `Booking is already ${booking.status}`,
//       });
//     }

//     booking.status = "cancelled";
//     booking.cancelledBy = role;
//     booking.cancellationReason = reason || "No reason provided";

//     await booking.save();

//     res.status(200).json({
//       success: true,
//       message: "Booking cancelled successfully",
//       booking,
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// export const getAllBookingsAdmin = async (req, res) => {
//   try {
//     const bookings = await Booking.find()
//       .populate("userId", "name email phoneNumber")
//       .populate("roomId", "name type images")
//       .populate("propertyId", "name city address partnerId")
//       .sort({ createdAt: -1 });

//     res.status(200).json({
//       success: true,
//       count: bookings.length,
//       bookings,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// Frontend → Create booking (pending)
// → Redirect to payment
// → Payment success → confirm booking
// → Payment failed → delete booking

//avaliblity check logic
//Uses strict inequalities (< and >) → allows same-day check-out/check-in (most common hotel policy)

const round = (num) => Math.round(num * 100) / 100;
const isRoomAvailable = async ({
  roomId,
  checkInDate,
  checkOutDate,
  quantity,
  blockedDates,
  totalRooms,
}) => {
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);

  if (blockedDates?.length) {
    const isBlocked = blockedDates.some((block) => {
      const blockStart = new Date(block.startDate);
      const blockEnd = new Date(block.endDate);

      return checkIn < blockEnd && checkOut > blockStart;
    });

    if (isBlocked) {
      return {
        available: false,
        reason: "Room is blocked for selected dates",
      };
    }
  }

  //2 Check overlapping bookings
  const overlappingBookings = await Booking.aggregate([
    {
      $match: {
        "rooms.roomId": new mongoose.Types.ObjectId(roomId),
        status: { $in: ["pending", "confirmed"] },
        checkInDate: { $lt: checkOut },
        checkOutDate: { $gt: checkIn },
      },
    },
    { $unwind: "$rooms" },
    { $match: { "rooms.roomId": new mongoose.Types.ObjectId(roomId) } },
    {
      $group: {
        _id: null,
        totalBooked: { $sum: "$rooms.quantity" },
      },
    },
  ]);

  const booked = overlappingBookings[0]?.totalBooked || 0;
  console.log(booked);
  // 3️ Final availability check
  if (booked + quantity > totalRooms) {
    return {
      available: false,
      reason: "Not enough rooms available",
    };
  }

  return {
    available: true,
  };
};
const getPaymentMethod = (paymentEntity) => {
  if (!paymentEntity?.method) return "other";

  if (paymentEntity.method === "card") {
    return paymentEntity.card?.type === "debit" ? "debit_card" : "credit_card";
  } else {
    return paymentEntity?.method;
  }
};

export const createBooking = asyncHandler(async (req, res, next) => {
  const {
    propertyId,
    rooms,
    checkInDate,
    checkOutDate,
    numberOfGuests,
    primaryGuestDetails,
    specialRequests,
  } = req.body;

  const userId = req.user._id;

  // BASIC BODY VALIDATION
  if (!propertyId) {
    return next(new CustomError("Property ID is required", 400));
  }

  if (!Array.isArray(rooms) || rooms.length === 0) {
    return next(new CustomError("At least one room is required", 400));
  }

  if (!checkInDate || !checkOutDate) {
    return next(
      new CustomError("Check-in and check-out dates are required", 400)
    );
  }

  if (!numberOfGuests) {
    return next(new CustomError("Adult guest count is required", 400));
  }

  const requiredKeys = [
    "fullName",
    "email",
    "phone",
    "address",
    "city",
    "country",
  ];

  const allKeyExists = requiredKeys.every((key) => primaryGuestDetails?.[key]);

  if (!allKeyExists) {
    return next(new CustomError("All primary guest fields are required", 400));
  }

  // 1️ Validate dates
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);

  if (isNaN(checkIn) || isNaN(checkOut)) {
    return next(new CustomError("Invalid date format", 400));
  }

  if (checkOut <= checkIn) {
    return next(
      new CustomError("Check-out date must be after check-in date", 400)
    );
  }

  // 2️ Fetch property
  const property = await Property.findById(propertyId).select(
    "status childrenCharge "
  );
  if (!property) {
    return next(new CustomError("Property not found", 404));
  }

  if (property.status !== "active") {
    return next(new CustomError("Property is currently inactive", 400));
  }

  // 3️ Calculate nights
  const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

  let basePrice = 0;
  let discountAmount = 0;
  let extraFees = 0;
  let childrenCharge = 0;
  const roomsData = [];
  // 4️ Loop rooms
  let totalCapacity = 0;

  for (const item of rooms) {
    if (!item.roomId) {
      return next(new CustomError("Room ID is required", 400));
    }

    if (!item.quantity || item.quantity < 1) {
      return next(new CustomError("Room quantity must be at least 1", 400));
    }

    const room = await Room.findById(item.roomId);
    if (!room) {
      return next(new CustomError("Room not found", 404));
    }

    const checkAvailability = await isRoomAvailable({
      roomId: item.roomId,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      quantity: item.quantity,
      blockedDates: room.blockedDates,
      totalRooms: room.numberOfRooms,
    });

    if (!checkAvailability.available) {
      return next(new CustomError(checkAvailability.reason, 404));
    }

    let roomDetails = {
      roomId: item.roomId,
      quantity: item.quantity,
      pricePerNight: room.pricePerNight,
      discount: room.discount,
      extraServices: [],
    };

    totalCapacity += room.capacity * item.quantity;

    // 4.3️ Room pricing
    const roomPrice = room.pricePerNight * item.quantity * nights;

    basePrice += roomPrice;

    // Room discount
    if (room.discount > 0) {
      discountAmount +=
        (room.discount / 100) * room.pricePerNight * item.quantity * nights;
    }
    // Extra services
    if (item.extraServices?.length) {
      item.extraServices.forEach((service) => {
        if (
          room.servicesAndExtras[service] &&
          room.servicesAndExtras[service]?.available
        ) {
          roomDetails.extraServices.push({
            name: service,
            fee: room.servicesAndExtras[service]?.fee,
          });
          extraFees +=
            room.servicesAndExtras[service]?.fee * item.quantity * nights;
        } else {
          return next(new CustomError(`${service} is not avilable`, 404));
        }
      });
    }

    roomsData.push(roomDetails);
  }

  // 5️ Children charges (property-level)
  const childCharge = property?.childrenCharge;
  let childCount = 0; // child >=childernCharge.age
  if (numberOfGuests.children?.length) {
    numberOfGuests.children.forEach((child) => {
      if (Number(child.age) >= Number(childCharge.age)) {
        childCount++;
      }
    });
  }

  if (numberOfGuests.adults > totalCapacity) {
    return next(
      new CustomError(" number of guest is more that total capacity of rooms")
    );
  } else {
    const overflow = Math.max(
      0,
      numberOfGuests.adults + childCount - totalCapacity
    );
    if (overflow > 0) {
      childrenCharge = childCharge.charge * overflow * nights;
    }
  }

  // 6️ Taxes & platform fee
  const platformFee = 100;
  const subTotal = basePrice - discountAmount + extraFees + childrenCharge;
  const taxes = subTotal * 0.12;
  console.log(extraFees);

  const totalPrice = subTotal + taxes + platformFee;

  // 8️ Create booking
  const booking = await Booking.create({
    userId,
    propertyId,
    rooms: roomsData,
    checkInDate: checkIn,
    checkOutDate: checkOut,
    numberOfGuests,
    primaryGuestDetails,
    specialRequests,
    priceBreakdown: {
      basePrice: round(basePrice),
      discountAmount: round(discountAmount),
      extraServicesFee: round(extraFees),
      childrenCharge: round(childrenCharge),
      taxes: round(taxes),
      platformFee,
    },
    totalPrice: round(totalPrice),
    status: "pending",
    paymentStatus: "pending",
    // expiresAt: Date.now() + 10 * 60 * 1000,
  });

  successResponse(res, 201, "booking created successfuly", booking);
});

export const updateBooking = asyncHandler(async (req, res, next) => {
  const { bookingId } = req.params;
  const userId = req.user._id;

  const {
    rooms,
    checkInDate,
    checkOutDate,
    numberOfGuests,
    primaryGuestDetails,
    specialRequests,
  } = req.body;

  // 1️ Fetch booking
  const booking = await Booking.findOne({
    _id: bookingId,
    userId,
  });

  if (!booking) {
    return next(new CustomError("Booking not found", 404));
  }

  if (!["pending", "expired"].includes(booking.status)) {
    return next(
      new CustomError("Only pending and expired bookings can be updated", 400)
    );
  }

  // 2️ Validate dates
  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);

  if (isNaN(checkIn) || isNaN(checkOut)) {
    return next(new CustomError("Invalid date format", 400));
  }

  if (checkOut <= checkIn) {
    return next(
      new CustomError("Check-out date must be after check-in date", 400)
    );
  }

  // 3️ Fetch property
  const property = await Property.findById(booking.propertyId).select(
    "status childrenCharge"
  );

  if (!property || property.status !== "active") {
    return next(new CustomError("Property is inactive", 400));
  }

  const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

  let basePrice = 0;
  let discountAmount = 0;
  let extraFees = 0;
  let childrenCharge = 0;
  let totalCapacity = 0;
  const roomsData = [];

  // 4️ Loop rooms
  for (const item of rooms) {
    if (!item.roomId) {
      return next(new CustomError("Room ID is required", 400));
    }

    if (!item.quantity || item.quantity < 1) {
      return next(new CustomError("Room quantity must be at least 1", 400));
    }
    const room = await Room.findById(item.roomId);
    if (!room) {
      return next(new CustomError("Room not found", 404));
    }

    // Availability check (exclude current booking)
    const overlappingBookings = await Booking.aggregate([
      {
        $match: {
          _id: { $ne: booking._id },
          "rooms.roomId": new mongoose.Types.ObjectId(item.roomId),
          status: { $in: ["pending", "confirmed"] },
          checkInDate: { $lt: checkOut },
          checkOutDate: { $gt: checkIn },
        },
      },
      { $unwind: "$rooms" },
      { $match: { "rooms.roomId": new mongoose.Types.ObjectId(item.roomId) } },
      {
        $group: {
          _id: null,
          totalBooked: { $sum: "$rooms.quantity" },
        },
      },
    ]);

    const booked = overlappingBookings[0]?.totalBooked || 0;

    if (booked + item.quantity > room.numberOfRooms) {
      return next(new CustomError("Not enough rooms available", 400));
    }

    totalCapacity += room.capacity * item.quantity;

    const roomPrice = room.pricePerNight * item.quantity * nights;
    basePrice += roomPrice;

    if (room.discount > 0) {
      discountAmount +=
        (room.discount / 100) * room.pricePerNight * item.quantity * nights;
    }

    const roomDetails = {
      roomId: item.roomId,
      quantity: item.quantity,
      pricePerNight: room.pricePerNight,
      discount: room.discount,
      extraServices: [],
    };

    if (item.extraServices?.length) {
      item.extraServices.forEach((service) => {
        if (room.servicesAndExtras?.[service]?.available) {
          roomDetails.extraServices.push({
            name: service,
            fee: room.servicesAndExtras[service].fee,
          });
          extraFees +=
            room.servicesAndExtras[service].fee * item.quantity * nights;
        }
      });
    }

    roomsData.push(roomDetails);
  }

  // 5️ Children charge
  const childConfig = property.childrenCharge;
  let childCount = 0;

  if (numberOfGuests.children?.length && childConfig) {
    numberOfGuests.children.forEach((child) => {
      if (Number(child) >= childConfig.age) {
        childCount++;
      }
    });
  }

  if (numberOfGuests.adults > totalCapacity) {
    return next(new CustomError("Guests exceed room capacity", 400));
  }

  const overflow = Math.max(
    0,
    numberOfGuests.adults + childCount - totalCapacity
  );

  if (overflow > 0 && childConfig) {
    childrenCharge = childConfig.charge * overflow;
  }
  // 6️ Taxes & platform fee
  const platformFee = 100;
  const subTotal = basePrice - discountAmount + extraFees + childrenCharge;
  const taxes = subTotal * 0.12;
  console.log(extraFees);

  const totalPrice = subTotal + taxes + platformFee;

  // 7️ Update booking
  booking.rooms = roomsData;
  booking.checkInDate = checkIn;
  booking.checkOutDate = checkOut;
  booking.numberOfGuests = numberOfGuests;
  booking.primaryGuestDetails = primaryGuestDetails;
  booking.specialRequests = specialRequests;
  booking.status = "pending";
  booking.priceBreakdown = {
    basePrice: round(basePrice),
    discountAmount: round(discountAmount),
    extraServicesFee: round(extraFees),
    childrenCharge: round(childrenCharge),
    taxes: round(taxes),
    platformFee,
  };

  booking.totalPrice = round(totalPrice);
  // booking.expiresAt = Date.now() + 10 * 60 * 1000;

  await booking.save();

  successResponse(res, 200, "Booking updated successfully", booking);
});

// Create Booking (pending)
//         ↓
// Start Payment
//         ↓
//  ┌───────────────┐
//  │ Payment Paid  │ → Confirm booking + code
//  └───────────────┘
//         ↓
//  ┌───────────────┐
//  │ Payment Fail  │ → Cancel booking
//  └───────────────┘
//         ↓
//  ┌───────────────┐
//  │ Time Expired  │ → Expire booking
//  └───────────────┘

//payment

export const createRazorpayOrder = asyncHandler(async (req, res, next) => {
  const userId = req.user?._id;
  const { bookingId } = req.params;

  const booking = await Booking.findOne({ _id: bookingId, userId });

  if (!booking) {
    return next(new CustomError("Booking not found", 404));
  }

  if (booking.status != "pending")
    return next(
      new CustomError("order only created for pending booking ", 400)
    );

  if (booking.payment?.razorpayOrderId && booking.paymentStatus == "paid") {
    return next(new CustomError("order allready created ", 400));
  }

  try {
    const options = {
      amount: Math.round(booking.totalPrice * 100),
      currency: "INR",
      receipt: booking._id.toString(),
    };

    const order = await razorpay.orders.create(options);

    booking.payment = {
      razorpayOrderId: order.id,
      amount: order.amount,
      currency: order.currency,
    };

    await booking.save();

    const data = {
      orderId: order.id,
      amount: order.amount,
    };

    successResponse(res, 201, "successfully created booking", data);
  } catch (error) {
    if (error?.error) {
      return next(
        new CustomError(
          error?.error?.description ||
            "Unable to initiate payment. Please try again.",
          error.statusCode || 502
        )
      );
    }

    console.error("Error:", error);

    return next(
      new CustomError("Unable to initiate payment. Please try again.", 502)
    );
  }
});

export const razorpayWebhook = asyncHandler(async (req, res, next) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return next(new CustomError("Webhook secret not configured", 500));
  }

  const razorpaySignature = req.headers["x-razorpay-signature"];

  if (!razorpaySignature) {
    return next(new CustomError("Missing Razorpay signature", 400));
  }

  //  Verify signature (RAW body required)
  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(req.body)
    .digest("hex");

  if (expectedSignature !== razorpaySignature) {
    return next(new CustomError("Invalid webhook signature", 400));
  }

  //  Parse event safely
  let event;
  try {
    event = JSON.parse(req.body.toString());
  } catch (err) {
    return next(new CustomError("Invalid webhook payload", 400));
  }

  const eventType = event?.event;
  const paymentEntity = event?.payload?.payment?.entity;

  if (!eventType || !paymentEntity) {
    return next(new CustomError("Malformed webhook event", 400));
  }

  const orderId = paymentEntity.order_id;
  const paymentId = paymentEntity.id;

  if (!orderId) {
    return next(new CustomError("Order ID missing in webhook", 400));
  }

  const booking = await Booking.findOne({ "payment.razorpayOrderId": orderId });

  if (booking?.paymentStatus === "paid") {
    return res.status(200).json({ success: true });
  }

  //  Handle supported events
  switch (eventType) {
    case "payment.captured": {
      const booking = await Booking.findOne({
        "payment.razorpayOrderId": orderId,
      });

      if (!booking) {
        return next(new CustomError("Booking not found for order", 404));
      }

      // Assign confirmation code ONLY once
      if (!booking.confirmationCode) {
        booking.confirmationCode = `BK-${booking._id
          .toString()
          .slice(-6)
          .toUpperCase()}`;
      }

      booking.paymentStatus = "paid";
      booking.status = "confirmed";
      booking.payment.razorpayPaymentId = paymentId;
      booking.payment.paymentMethod = getPaymentMethod(paymentEntity);

      await booking.save();

      break;
    }

    case "payment.failed": {
      const booking = await Booking.findOneAndUpdate(
        { "payment.razorpayOrderId": orderId },
        {
          paymentStatus: "failed",
          "payment.paymentMethod": getPaymentMethod(paymentEntity),
        },
        { new: true }
      );

      if (!booking) {
        return next(new CustomError("Booking not found for order", 404));
      }

      break;
    }

    // 🟡 Ignore other events safely
    default:
      // Example: order.paid, payment.authorized, refund.created
      return res.status(200).json({
        success: true,
        message: `Event ${eventType} ignored`,
      });
  }

  //  Always respond 200 to Razorpay
  res.status(200).json({ success: true });
});

export const getBookingById = asyncHandler(async (req, res, next) => {
  const { bookingId } = req.params;

  if (!bookingId) {
    return next(new CustomError("Booking ID is required", 400));
  }

  const booking = await Booking.findById(bookingId)
    .populate({ path: "propertyId", select: "name policies" })
    .populate({ path: "userId", select: "name" })
    .populate({ path: "rooms.roomId", select: "name typeOfRoom" });

  if (!booking) {
    return next(new CustomError("Booking not found", 404));
  }

  successResponse(res, 200, "successfully fetch booking ", booking);
});

const calculateRefundPercentage = ({
  cancellationPolicy = [],
  checkInDate,
}) => {
  if (!cancellationPolicy.length) return 0;

  const now = new Date();
  const checkIn = new Date(checkInDate);

  const diffInDays = Math.ceil((checkIn - now) / (1000 * 60 * 60 * 24));

  if (diffInDays <= 0) return 0;

  // Sort DESC (important)
  const sortedPolicy = [...cancellationPolicy].sort(
    (a, b) => b.daysBeforeCheckIn - a.daysBeforeCheckIn
  );

  for (const rule of sortedPolicy) {
    if (diffInDays >= rule.daysBeforeCheckIn) {
      return rule.refundPercentage;
    }
  }

  return 0;
};

export const cancelBooking = asyncHandler(async (req, res, next) => {
  const { bookingId } = req.params;
  const userId = req.user._id;
  const { reason } = req.body;

  const booking = await Booking.findById(bookingId).populate(
    "propertyId",
    "cancellationPolicy"
  );

  if (!booking) {
    return next(new CustomError("Booking not found", 404));
  }

  if (booking.status !== "confirmed") {
    return next(
      new CustomError("Only confirmed bookings can be cancelled", 400)
    );
  }
  if (booking.cancellation?.razorpayRefundId) {
    return next(new CustomError("Refund already applied", 400));
  }

  if (!reason) {
    return next(new CustomError("Please give a valid reason", 400));
  }

  if (new Date() >= booking.checkInDate) {
    return next(
      new CustomError("Cancellation not allowed after check-in", 400)
    );
  }

  const wasPaid = booking.paymentStatus === "paid";

  const refundPercentage = 0;
  if (req.user?.role == "PARTNER") {
    refundPercentage = 100;
  } else {
    refundPercentage = calculateRefundPercentage({
      cancellationPolicy: booking.propertyId.cancellationPolicy,
      checkInDate: booking.checkInDate,
    });
  }

  const refundAmount = (booking.totalPrice * refundPercentage) / 100;

  booking.status = "cancelled";
  booking.paymentStatus =
    refundAmount > 0 && wasPaid ? "refund_pending" : "no_refund";

  booking.cancellation = {
    cancelledBy: userId,
    cancellationDate: new Date(),
    refundAmount,
    reason,
  };

  // Save cancellation FIRST
  await booking.save();

  //  Initiate refund
  if (refundAmount > 0 && wasPaid) {
    try {
      const refund = await razorpay.payments.refund(
        booking.payment.razorpayPaymentId,
        {
          amount: Math.round(refundAmount * 100),
          notes: {
            bookingId: booking._id.toString(),
            reason,
          },
        }
      );

      booking.cancellation.razorpayRefundId = refund.id;
      await booking.save();
    } catch (error) {
      console.error("Refund initiation failed:", error);

      booking.paymentStatus = "refund_failed";
      await booking.save();
      if (error?.error) {
        return next(
          new CustomError(
            error?.error?.description ||
              "Cancellation done but refund initiation failed.",
            error.statusCode || 502
          )
        );
      }

      return next(
        new CustomError(
          "Cancellation done but refund initiation failed. Support will contact you.",
          502
        )
      );
    }
  }

  successResponse(res, 200, "Cancellation successful", {
    refundAmount,
    cancellationDate: booking.cancellation.cancellationDate,
  });
});

export const razorpayRefundWebhook = asyncHandler(async (req, res) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const razorpaySignature = req.headers["x-razorpay-signature"];

  if (!razorpaySignature) {
    return res.status(200).json({ success: true });
  }

  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(req.body)
    .digest("hex");

  if (expectedSignature !== razorpaySignature) {
    return res.status(200).json({ success: true });
  }

  let event;
  try {
    event = JSON.parse(req.body.toString());
  } catch {
    return res.status(200).json({ success: true });
  }

  const eventType = event.event;

  if (eventType === "refund.processed") {
    const refund = event.payload.refund.entity;

    await Booking.findOneAndUpdate(
      { "cancellation.razorpayRefundId": refund.id },
      { paymentStatus: "refunded" }
    );
  }

  if (eventType === "refund.failed") {
    const refund = event.payload.refund.entity;

    await Booking.findOneAndUpdate(
      { "cancellation.razorpayRefundId": refund.id },
      { paymentStatus: "refund_failed" }
    );
  }

  res.status(200).json({ success: true });
});

export const deleteBooking = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;

  const { bookingId } = req.params;

  const booking = await Booking.findOne({ _id: bookingId, userId });

  if (!booking) {
    return next(new CustomError("booking not found", 404));
  }

  if (booking.status != "pending") {
    return next(new CustomError("not allowed to delete  paid booking", 400));
  }

  await Booking.findByIdAndDelete(bookingId);

  successResponse(res, 200, "booking deleted successfully");
});

export const getMyBooking = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;

  const {
    page = 1,
    limit = 10,
    status, // optional filter
  } = req.query;

  const query = {
    userId,
  };

  if (status) {
    query.status = status;
  }

  const skip = (Number(page) - 1) * Number(limit);

  const bookings = await Booking.find(query)
    .populate("propertyId", "name ")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  const total = await Booking.countDocuments(query);

  successResponse(res, 200, "My bookings fetched successfully", {
    total,
    page: Number(page),
    limit: Number(limit),
    bookings,
  });
});

// export const getBookingForProperty = asyncHandler(async (req, res, next) => {
//   const { propertyId } = req.params;

//   const {
//     status,
//     paymentStatus,
//     fromDate,
//     toDate,
//     page = 1,
//     limit = 10,
//   } = req.query;

//   // if property belongs to logged-in user
//   const property = await Property.findOne({
//     _id: propertyId,
//     partnerId: req.user._id,
//   });
//   if (!property) return next(new CustomError("Unauthorized access", 403));

//   const query = { propertyId };

//   if (status) query.status = status;
//   if (paymentStatus) query.paymentStatus = paymentStatus;

//   if (fromDate || toDate) {
//     query.checkInDate = {};
//     if (fromDate) query.checkInDate.$gte = new Date(fromDate);
//     if (toDate) query.checkInDate.$lte = new Date(toDate);
//   }

//   const skip = (Number(page) - 1) * Number(limit);

//   const [bookings, total] = await Promise.all([
//     Booking.find(query)
//       .populate("userId", "name email phone")
//       .populate("rooms.roomId", "name typeOfRoom")
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(Number(limit)),

//     Booking.countDocuments(query),
//   ]);

//   successResponse(res, 200, "Property bookings fetched", {
//     bookings,
//     pagination: {
//       total,
//       page: Number(page),
//       limit: Number(limit),
//       totalPages: Math.ceil(total / limit),
//     },
//   });
// });

export const getBooking = asyncHandler(async (req, res, next) => {
  const {
    page = 1,
    limit = 10,
    status,
    paymentStatus,
    propertyId,
    fromDate,
    toDate,
    dateType = "checkin", //booking -
    sortBy = "createdAt",
    order = "desc",
  } = req.query;

  const query = {};

  if (req.user.role == "PARTNER") {
    if (!req.query.propertyId)
      return next(new CustomError("propertyId required for partner", 400));

    // for partner
    const property = await Property.findOne({
      _id: propertyId,
      partnerId: req.user._id,
    });
    if (!property) return next(new CustomError("Unauthorized access", 403));
  }
  // ================= Filters =================

  if (status) query.status = status;
  if (paymentStatus) query.paymentStatus = paymentStatus;
  if (propertyId) query.propertyId = propertyId;

  // ================= Date Filtering =================
  if (fromDate && toDate) {
    const from = new Date(fromDate);
    const to = new Date(toDate);

    if (isNaN(from) || isNaN(to)) {
      return next(new CustomError("Invalid date format", 400));
    }

    if (dateType === "booking") {
      query.createdAt = { $gte: from, $lte: to };
    } else if (dateType === "stay") {
      query.$or = [
        {
          checkInDate: { $lte: to },
          checkOutDate: { $gte: from },
        },
      ];
    } else {
      // default: check-in
      query.checkInDate = { $gte: from, $lte: to };
    }
  }

  // ================= Pagination =================
  const skip = (Number(page) - 1) * Number(limit);

  // ================= Sorting =================
  const sort = {
    [sortBy]: order === "asc" ? 1 : -1,
  };

  // ================= Query =================
  const bookings = await Booking.find(query)
    .populate("userId", "name email phone")
    .populate("propertyId", "name ")
    .sort(sort)
    .skip(skip)
    .limit(Number(limit));

  const total = await Booking.countDocuments(query);

  successResponse(res, 200, "Bookings fetched successfully", {
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(total / limit),
    bookings,
  });
});
