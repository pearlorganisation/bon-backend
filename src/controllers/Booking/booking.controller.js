import Booking from "../../models/Listing/booking.model.js";
import Room from "../../models/Listing/room.model.js";
import Property from "../../models/Listing/property.model.js";
import RoomInventory from "../../models/Listing/roomInventory.model.js";
import PartnerPlan from "../../models/Partner/PartnerPlan.model.js";
import asyncHandler from "../../middleware/asyncHandler.js";
import { sendEmail } from "../../utils/mail/mailer.js";
import CustomError from "../../utils/error/customError.js";
import mongoose from "mongoose";
import { check } from "express-validator";
import successResponse from "../../utils/error/successResponse.js";
import { razorpay } from "../../config/razorpayConfig.js";
import crypto from "crypto";
import { isGeneratorFunction } from "util/types";
import PartnerMonthlyPayoutModel from "../../models/Partner/PartnerMonthlyPayout.model.js";
import { createCustomerInvoice } from "../../utils/invoive/createInvoice.js";

const round = (num) => Math.round(num * 100) / 100;
// utils/dateUtils.js

export const normalizeDate = (date) => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

export const getDatesBetween = (checkIn, checkOut) => {
  const dates = [];
  let current = normalizeDate(checkIn);
  const end = normalizeDate(checkOut);

  // checkout date is exclusive
  while (current < end) {
    dates.push(new Date(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
};

// export const isRoomBlocked = (room, checkIn, checkOut) => {
//   if (!room.blockedDates?.length) return false;

//   return room.blockedDates.some((block) => {
//     const blockStart = new Date(block.startDate);
//     const blockEnd = new Date(block.endDate);

//     return checkIn < blockEnd && checkOut > blockStart;
//   });
// };

// const isRoomAvailable = async ({
//   roomId,
//   checkInDate,
//   checkOutDate,
//   quantity,
//   blockedDates,
//   totalRooms,
// }) => {
//   const checkIn = new Date(checkInDate);
//   const checkOut = new Date(checkOutDate);

//   if (blockedDates?.length) {
//     const isBlocked = blockedDates.some((block) => {
//       const blockStart = new Date(block.startDate);
//       const blockEnd = new Date(block.endDate);

//       return checkIn < blockEnd && checkOut > blockStart;
//     });

//     if (isBlocked) {
//       return {
//         available: false,
//         reason: "Room is blocked for selected dates",
//       };
//     }
//   }

//   //2 Check overlapping bookings
//   const overlappingBookings = await Booking.aggregate([
//     {
//       $match: {
//         "rooms.roomId": new mongoose.Types.ObjectId(roomId),
//         status: { $in: ["pending", "confirmed"] },
//         checkInDate: { $lt: checkOut },
//         checkOutDate: { $gt: checkIn },
//       },
//     },
//     { $unwind: "$rooms" },
//     { $match: { "rooms.roomId": new mongoose.Types.ObjectId(roomId) } },
//     {
//       $group: {
//         _id: null,
//         totalBooked: { $sum: "$rooms.quantity" },
//       },
//     },
//   ]);

//   const booked = overlappingBookings[0]?.totalBooked || 0;
//   console.log(booked);
//   // 3️ Final availability check
//   if (booked + quantity > totalRooms) {
//     return {
//       available: false,
//       reason: "Not enough rooms available",
//     };
//   }

//   return {
//     available: true,
//   };
// };
const getPaymentMethod = (paymentEntity) => {
  if (!paymentEntity?.method) return "other";

  if (paymentEntity.method === "card") {
    return paymentEntity.card?.type === "debit" ? "debit_card" : "credit_card";
  } else {
    return paymentEntity?.method;
  }
};
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
    (a, b) => b.daysBeforeCheckIn - a.daysBeforeCheckIn,
  );

  for (const rule of sortedPolicy) {
    if (diffInDays >= rule.daysBeforeCheckIn) {
      return rule.refundPercentage;
    }
  }

  return 0;
};

const getGST = (amount) => {
  let gstRate = 0;

  if (amount <= 1000) {
    gstRate = 0;
  } else if (amount <= 7500) {
    gstRate = 5;
  } else {
    gstRate = 18;
  }

  const gstAmount = (amount * gstRate) / 100;

  return {
    gstRate,
    gstAmount,
  };
};

//controllers

export const createBooking = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
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

    // 1️ Basic validation
    if (!propertyId) throw new CustomError("Property ID is required", 400);
    if (!Array.isArray(rooms) || rooms.length === 0)
      throw new CustomError("At least one room is required", 400);
    if (!checkInDate || !checkOutDate)
      throw new CustomError("Check-in and check-out dates are required", 400);
    if (!numberOfGuests) throw new CustomError("Guest count is required", 400);

    const requiredKeys = [
      "fullName",
      "email",
      "phone",
      "address",
      "city",
      "country",
    ];
    const allKeyExists = requiredKeys.every(
      (key) => primaryGuestDetails?.[key],
    );
    if (!allKeyExists)
      throw new CustomError("All primary guest fields are required", 400);

    // 2️ Validate dates
    const checkIn = normalizeDate(checkInDate);
    const checkOut = normalizeDate(checkOutDate);
    if (isNaN(checkIn) || isNaN(checkOut))
      throw new CustomError("Invalid date format", 400);

    if (checkOut <= checkIn)
      throw new CustomError("Check-out date must be after check-in date ", 400);

    // 3️ Fetch property
    const property = await Property.findById(propertyId)
      .session(session)
      .select("status verified childrenCharge partnerId");

    if (!property) throw new CustomError("Property not found", 404);

    if (property.status !== "active" || property.verified !== "approved")
      throw new CustomError("Property is inactive or not verified", 400);

    const partnerPlan = await PartnerPlan.findOne({
      partnerId: property.partnerId,
      planStatus: "ACTIVE",
    }).session(session);

    if (!partnerPlan) {
      throw new CustomError("Property is not available for booking", 400);
    }

    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

    let basePrice = 0;
    let discountAmount = 0;
    let extraFees = 0;
    let childrenCharge = 0;
    let totalCapacity = 0;
    let total_gst = 0;
    const roomsData = [];

    const dates = getDatesBetween(checkIn, checkOut);
    console.log(dates, "dates");
    // 4️ Loop rooms
    for (const item of rooms) {
      if (!item.roomId) throw new CustomError("Room ID is required", 400);
      if (!item.quantity || item.quantity < 1)
        throw new CustomError("Room quantity must be at least 1", 400);

      const room = await Room.findOne({ _id: item.roomId, propertyId }).session(
        session,
      );
      if (!room) throw new CustomError("Room not found", 404);

      // ❌ Blocked date check
      if (isRoomBlocked(room, checkIn, checkOut)) {
        throw new CustomError(
          `Room ${room.name} is blocked for selected dates`,
          400,
        );
      }
      // // ❌ Blocked date check
      // if (isRoomBlocked(room, checkIn, checkOut)) {
      //   throw new CustomError(
      //     `Room ${room.name} is blocked for selected dates`,
      //     400
      //   );
      // }

      //  Date-wise availability
      const inventories = await RoomInventory.find({
        propertyId,
        roomId: item.roomId,
        date: { $in: dates },
      }).session(session);

      const inventoryMap = new Map();
      inventories.forEach((inv) =>
        inventoryMap.set(normalizeDate(inv.date).toISOString(), inv),
      );

      for (const date of dates) {
        const key = normalizeDate(date).toISOString();
        const inv = inventoryMap.get(key);
        const booked = inv?.bookedRooms || 0;
        const total = inv?.totalRooms;

        if (booked + item.quantity > total) {
          throw new CustomError(
            `Not enough availability for ${room.name} on ${key.slice(0, 10)}`,
            400,
          );
        }
      }

      // 🔐 Reserve inventory
      for (const date of dates) {
        const updated = await RoomInventory.findOneAndUpdate(
          { roomId: item.roomId, date },
          {
            $setOnInsert: {
              propertyId,
              roomId: item.roomId,
              date,
              totalRooms: room.numberOfRooms,
            },
            $inc: { bookedRooms: item.quantity },
          },
          { upsert: true, new: true, session },
        );

        if (updated.bookedRooms > updated.totalRooms) {
          throw new CustomError(`Overbooking detected for ${room.name}`, 400);
        }
      }

      //  Pricing
      totalCapacity += room.capacity * item.quantity;
      const roomPrice = room.pricePerNight * item.quantity * nights;
      basePrice += roomPrice;

      let effectivePrice = room.pricePerNight;

      if (room.discount > 0) {
        discountAmount +=
          (room.discount / 100) * room.pricePerNight * item.quantity * nights;

        effectivePrice =
          room.pricePerNight - (room.discount * room.pricePerNight) / 100;
      }

      let gst = getGST(effectivePrice);
      total_gst += gst.gstAmount * item.quantity * nights;

      const roomDetails = {
        roomId: item.roomId,
        quantity: item.quantity,
        pricePerNight: room.pricePerNight,
        discount: round((room.discount * room.pricePerNight) / 100),
        room_gst: {
          gst_rate: gst.gstRate,
          gst_amount: gst.gstAmount * item.quantity * nights,
        },
        extraServices: [],
      };

      if (item.extraServices?.length) {
        for (const service of item.extraServices) {
          if (room.servicesAndExtras?.[service]?.available) {
            roomDetails.extraServices.push({
              name: service,
              fee: room.servicesAndExtras[service].fee,
            });
            extraFees +=
              room.servicesAndExtras[service].fee * item.quantity * nights;
          } else {
            throw new CustomError(`${service} is not available`, 400);
          }
        }
      }

      roomsData.push(roomDetails);
    }

    // 5️ Children charges
    const childConfig = property.childrenCharge;
    let childCount = 0;

    if (numberOfGuests.children?.length && childConfig) {
      numberOfGuests.children.forEach((child) => {
        if (Number(child.age) >= Number(childConfig.age)) {
          childCount++;
        }
      });
    }

    if (numberOfGuests.adults > totalCapacity)
      throw new CustomError("Number of guests exceeds room capacity", 400);

    const overflow = Math.max(
      0,
      numberOfGuests.adults + childCount - totalCapacity,
    );

    if (overflow > 0 && childConfig) {
      childrenCharge = childConfig.charge * overflow * nights;
    }

    // 6️ calculate gst
    let totalPrice =
      basePrice - discountAmount + extraFees + childrenCharge + total_gst;

    // 7️ Create booking
    const booking = await Booking.create(
      [
        {
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
            gst_amount: round(total_gst),
            partnerPlanId: partnerPlan._id,
          },
          totalPrice: round(totalPrice),
          status: "pending",
          paymentStatus: "pending",
        },
      ],
      { session },
    );

    await session.commitTransaction();
    session.endSession();

    successResponse(res, 201, "Booking created successfully", booking);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
});

export const updateBooking = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
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
    }).session(session);

    if (!booking) {
      throw new CustomError("Booking not found", 404);
    }

    if (!["pending", "expired"].includes(booking.status)) {
      throw new CustomError(
        "Only pending or expired bookings can be updated",
        400,
      );
    }

    // 2️⃣ Validate dates
    const checkIn = normalizeDate(checkInDate);
    const checkOut = normalizeDate(checkOutDate);

    if (isNaN(checkIn) || isNaN(checkOut)) {
      throw new CustomError("Invalid date format", 400);
    }

    if (checkOut <= checkIn) {
      throw new CustomError("Check-out date must be after check-in date", 400);
    }

    // 3️⃣ Fetch property
    const property = await Property.findById(booking.propertyId)
      .session(session)
      .select("status childrenCharge verified partnerId");

    if (
      !property ||
      property.status !== "active" ||
      property.verified !== "approved"
    ) {
      throw new CustomError("Property is inactive or not verified", 400);
    }

    const partnerPlan = await PartnerPlan.findOne({
      partnerId: property.partnerId,
      planStatus: "ACTIVE",
    }).session(session);

    if (!partnerPlan) {
      throw new CustomError("Property is not available", 400);
    }

    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

    // 4️⃣ Release OLD inventory
    const oldDates = getDatesBetween(booking.checkInDate, booking.checkOutDate);

    for (const oldRoom of booking.rooms) {
      await RoomInventory.updateMany(
        {
          roomId: oldRoom.roomId,
          date: { $in: oldDates },
        },
        {
          $inc: { bookedRooms: -oldRoom.quantity },
        },
        { session },
      );
    }

    // 5️⃣ Re-check & reserve NEW inventory
    let basePrice = 0;
    let discountAmount = 0;
    let extraFees = 0;
    let childrenCharge = 0;
    let totalCapacity = 0;
    let total_gst = 0;
    const roomsData = [];

    const newDates = getDatesBetween(checkIn, checkOut);

    for (const item of rooms) {
      if (!item.roomId || item.quantity < 1) {
        throw new CustomError("Invalid room data", 400);
      }

      const room = await Room.findById(item.roomId).session(session);
      if (!room) {
        throw new CustomError("Room not found", 404);
      }

      if (isRoomBlocked(room, checkIn, checkOut)) {
        throw new CustomError(
          `Room ${room.name} is blocked for selected dates`,
          400,
        );
      }
      // if (isRoomBlocked(room, checkIn, checkOut)) {
      //   throw new CustomError(
      //     `Room ${room.name} is blocked for selected dates`,
      //     400
      //   );
      // }

      // Availability check
      const inventories = await RoomInventory.find({
        roomId: item.roomId,
        date: { $in: newDates },
      }).session(session);

      const inventoryMap = new Map();
      inventories.forEach((inv) =>
        inventoryMap.set(normalizeDate(inv.date).toISOString(), inv),
      );

      for (const date of newDates) {
        const key = normalizeDate(date).toISOString();
        const inv = inventoryMap.get(key);
        const booked = inv?.bookedRooms || 0;
        const total = inv?.totalRooms || room.numberOfRooms;

        if (booked + item.quantity > total) {
          throw new CustomError(
            `Not enough availability for ${room.name} on ${key.slice(0, 10)}`,
            400,
          );
        }
      }

      // Reserve inventory
      for (const date of newDates) {
        const updated = await RoomInventory.findOneAndUpdate(
          { roomId: item.roomId, date },
          {
            $setOnInsert: {
              propertyId: booking.propertyId,
              roomId: item.roomId,
              date,
              totalRooms: room.numberOfRooms,
            },
            $inc: { bookedRooms: item.quantity },
          },
          { upsert: true, new: true, session },
        );

        if (updated.bookedRooms > updated.totalRooms) {
          throw new CustomError(`Overbooking detected for ${room.name}`, 400);
        }
      }

      // 6️⃣ Pricing
      totalCapacity += room.capacity * item.quantity;

      const roomPrice = room.pricePerNight * item.quantity * nights;

      basePrice += roomPrice;

      let effectivePrice = room.pricePerNight;

      if (room.discount > 0) {
        discountAmount +=
          (room.discount / 100) * room.pricePerNight * item.quantity * nights;

        effectivePrice =
          room.pricePerNight - (room.discount * room.pricePerNight) / 100;
      }

      // GST per room (same as createBooking)
      const gst = getGST(effectivePrice);
      const roomGstAmount = gst.gstAmount * item.quantity * nights;

      total_gst += roomGstAmount;

      const roomDetails = {
        roomId: item.roomId,
        quantity: item.quantity,
        pricePerNight: room.pricePerNight,
        discount: room.discount,
        room_gst: {
          gst_rate: gst.gstRate,
          gst_amount: roomGstAmount,
        },
        extraServices: [],
      };

      if (item.extraServices?.length) {
        for (const service of item.extraServices) {
          if (room.servicesAndExtras?.[service]?.available) {
            roomDetails.extraServices.push({
              name: service,
              fee: room.servicesAndExtras[service].fee,
            });

            extraFees +=
              room.servicesAndExtras[service].fee * item.quantity * nights;
          }
        }
      }

      roomsData.push(roomDetails);
    }

    // 7️⃣ Children charges
    const childConfig = property.childrenCharge;
    let childCount = 0;

    if (numberOfGuests.children?.length && childConfig) {
      numberOfGuests.children.forEach((child) => {
        if (Number(child.age) >= Number(childConfig.age)) {
          childCount++;
        }
      });
    }

    if (numberOfGuests.adults > totalCapacity) {
      throw new CustomError("Guests exceed room capacity", 400);
    }

    const overflow = Math.max(
      0,
      numberOfGuests.adults + childCount - totalCapacity,
    );

    if (overflow > 0 && childConfig) {
      childrenCharge = childConfig.charge * overflow * nights;
    }

    // 8️⃣ Final total (same as createBooking)
    const totalPrice =
      basePrice - discountAmount + extraFees + childrenCharge + total_gst;

    // 9️⃣ Update booking
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
      gst_amount: round(total_gst),
      partnerPlanId: partnerPlan._id,
    };

    booking.totalPrice = round(totalPrice);

    await booking.save({ session });

    await session.commitTransaction();
    session.endSession();

    successResponse(res, 200, "Booking updated successfully", booking);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
});

export const selectPayOnArrivalMode = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  const { bookingId } = req.params;

  const result = await Booking.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(bookingId),
        userId: new mongoose.Types.ObjectId(userId),
        status: "pending",
      },
    },
    {
      $lookup: {
        from: "properties",
        localField: "propertyId",
        foreignField: "_id",
        as: "property",
      },
    },
    { $unwind: "$property" },
    {
      $set: {
        paymentModes: "$property.paymentModes",
      },
    },

    {
      $project: {
        property: 0,
      },
    },
  ]);

  if (!result.length) {
    return next(new CustomError("Booking not found", 404));
  }

  const booking = result[0];

  if (booking.status != "pending") {
    return next(
      new CustomError("This mode is only avilable for pending booking", 400),
    );
  }

  if (!booking.paymentModes.PAY_ON_ARRIVAL) {
    return next(new CustomError("pay on Arrival mode is not avilable", 400));
  }
  const bookingDoc = await Booking.findById(bookingId);
  bookingDoc.paymentMode = "PAY_ON_ARRIVAL";
  bookingDoc.status = "confirmed";

  // Assign confirmation code ONLY once
  if (!booking.confirmationCode) {
    booking.confirmationCode = `BK-${booking._id
      .toString()
      .slice(-6)
      .toUpperCase()}`;
  }
  await bookingDoc.save();

  if (!booking.invoiceId) {
    createCustomerInvoice(booking._id).catch((error) =>
      console.log("Invoice generation failed", error),
    );
  }

  successResponse(res, 200, "Mode applied on booking");
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
//
export const createRazorpayOrder = asyncHandler(async (req, res, next) => {
  const userId = req.user?._id;
  const { bookingId } = req.params;

  const result = await Booking.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(bookingId),
      },
    },
    {
      $lookup: {
        from: "properties",
        localField: "propertyId",
        foreignField: "_id",
        as: "property",
      },
    },
    { $unwind: "$property" },
    {
      $set: {
        paymentModes: "$property.paymentModes",
      },
    },

    {
      $project: {
        property: 0,
      },
    },
  ]);

  if (!result.length) {
    return next(new CustomError("Booking not found", 404));
  }

  let booking = result[0];

  if (booking.status != "pending") {
    return next(
      new CustomError("order only created for pending booking ", 400),
    );
  }

  if (!booking.paymentModes.PAY_NOW) {
    return next(
      new CustomError("PAY NOW mode is not avilable for this property!", 400),
    );
  }

  if (booking.payment?.razorpayOrderId && booking.paymentStatus == "paid") {
    return next(new CustomError("payment  allready  done ", 400));
  }

  booking = await Booking.findById(bookingId);

  booking.paymentMode = "PAY_NOW";

  try {
    const options = {
      amount: Math.round(booking.totalPrice * 100),
      currency: "INR",
      receipt: booking._id.toString(),
      notes: {
        purpose: "BOOKING",
        bookingId: booking._id.toString(),
      },
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
          error.statusCode || 502,
        ),
      );
    }

    console.error("Error:", error);

    return next(
      new CustomError("Unable to initiate payment. Please try again.", 502),
    );
  }
});

export const bookingWebhookController = asyncHandler(async (req, res, next) => {
  const { eventType, orderId, paymentId, paymentEntity } = req.razorpay;
  console.log("payment", req.razorpay);

  if (!eventType || !paymentEntity) {
    return next(new CustomError("Malformed webhook event", 400));
  }

  if (!orderId) {
    return next(new CustomError("Order ID missing in webhook", 400));
  }

  const booking = await Booking.findOne({ "payment.razorpayOrderId": orderId });

  if (
    booking.paymentStatus === "paid" &&
    booking.payment.razorpayPaymentId === paymentId
  ) {
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

      if (!booking.invoiceId) {
        createCustomerInvoice(booking._id).catch((error) =>
          console.log("Invoice generation failed", error),
        );
      }

      break;
    }

    case "payment.failed": {
      const booking = await Booking.findOneAndUpdate(
        { "payment.razorpayOrderId": orderId },
        {
          paymentStatus: "failed",
          "payment.paymentMethod": getPaymentMethod(paymentEntity),
        },
        { new: true },
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
    .populate({ path: "rooms.roomId", select: "name typeOfRoom" })
    .populate({ path: "invoiceId" });

  if (!booking) {
    return next(new CustomError("Booking not found", 404));
  }
  if (req.user.role === "CUSTOMER") {
    if (booking.userId.toString() !== user._id.toString()) {
      return next(new CustomError("not allowed ", 401));
    }
  }

  successResponse(res, 200, "successfully fetch booking ", booking);
});

export const cancelBooking = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { bookingId } = req.params;
    const userId = req.user._id;
    const { reason } = req.body;

    if (!reason) {
      throw new CustomError("Please give a valid reason", 400);
    }

    const booking = await Booking.findById(bookingId)
      .populate("propertyId", "cancellationPolicy")
      .session(session);

    if (!booking) {
      throw new CustomError("Booking not found", 404);
    }

    if (booking.status !== "confirmed") {
      throw new CustomError("Only confirmed bookings can be cancelled", 400);
    }

    if (new Date() >= booking.checkInDate) {
      throw new CustomError("Cancellation not allowed after check-in", 400);
    }

    if (
      booking.paymentMode == "PAY_NOW" &&
      booking.paymentStatus === "paid" &&
      booking.cancellation?.razorpayRefundId
    ) {
      throw new CustomError("Refund already applied", 400);
    }

    const wasPaid = booking.paymentStatus === "paid";

    // 1️ Calculate refund
    let refundPercentage = 0;
    let refundAmount = 0; // for PAY_ON_ARRIVAL
    let retainedAmount = 0;
    if (booking.paymentMode == "PAY_NOW") {
      if (req.user?.role === "PARTNER") {
        refundPercentage = 100;
      } else {
        // refundPercentage = calculateRefundPercentage({
        //   cancellationPolicy: booking.propertyId.cancellationPolicy,
        //   checkInDate: booking.checkInDate,
        // });
        refundPercentage = 100;
      }

      refundAmount = (booking.totalPrice * refundPercentage) / 100;
      retainedAmount = booking.totalPrice - refundAmount;

      //  split payment what to do ...
      if (retainedAmount > 0) {
        await splitCancellationMoney(booking, retainedAmount);
      }
    }

    // 2️ Release inventory (CRITICAL)
    await releaseInventory(booking);

    // 3️ Update booking
    booking.status = "cancelled";
    booking.paymentStatus =
      refundAmount > 0 && wasPaid ? "refund_pending" : "no_refund";

    booking.cancellation = {
      cancelledBy: userId,
      cancellationDate: new Date(),
      refundAmount: round(refundAmount),
      reason,
    };

    await booking.save({ session });

    // 4️ Commit DB changes
    await session.commitTransaction();
    session.endSession();

    // 5️ Initiate refund (OUTSIDE transaction)
    if (refundAmount > 0 && wasPaid) {
      try {
        const refund = await razorpay.payments.refund(
          booking.payment.razorpayPaymentId,
          {
            amount: round(refundAmount * 100),
            notes: {
              bookingId: booking._id.toString(),
              reason,
            },
          },
        );

        booking.cancellation.razorpayRefundId = refund.id;
        await booking.save();
      } catch (error) {
        console.error("Refund initiation failed:", error);

        booking.paymentStatus = "refund_failed";
        await booking.save();

        throw new CustomError(
          "Cancellation successful but refund initiation failed. Support will contact you.",
          502,
        );
      }
    }

    successResponse(res, 200, "Booking cancelled successfully", {
      refundAmount: round(refundAmount),
      cancellationDate: booking.cancellation.cancellationDate,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
});

export const razorpayRefundWebhook = asyncHandler(async (req, res) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const razorpaySignature = req.headers["x-razorpay-signature"];
  console.log("refund");
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
    console.log("webhook response", event);
  } catch {
    return res.status(200).json({ success: true });
  }

  const eventType = event.event;
  console.log(event);

  if (eventType === "refund.processed") {
    const refund = event.payload.refund.entity;

    await Booking.findOneAndUpdate(
      { "cancellation.razorpayRefundId": refund.id },
      { paymentStatus: "refunded" },
    );
  }

  if (eventType === "refund.failed") {
    const refund = event.payload.refund.entity;

    await Booking.findOneAndUpdate(
      { "cancellation.razorpayRefundId": refund.id },
      { paymentStatus: "refund_failed" },
    );
  }

  res.status(200).json({ success: true });
});

export const deleteBooking = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user._id;
    const { bookingId } = req.params;

    const booking = await Booking.findOne({
      _id: bookingId,
      userId,
    }).session(session);

    if (!booking) {
      throw new CustomError("Booking not found", 404);
    }

    if (!["pending", "expired"].includes(booking.status)) {
      throw new CustomError(
        "Only pending or expired bookings can be deleted",
        400,
      );
    }

    // 1️ Release inventory
    const dates = getDatesBetween(
      normalizeDate(booking.checkInDate),
      normalizeDate(booking.checkOutDate),
    );

    for (const room of booking.rooms) {
      for (const date of dates) {
        await RoomInventory.findOneAndUpdate(
          {
            roomId: room.roomId,
            date,
          },
          {
            $inc: { bookedRooms: -room.quantity },
          },
          { session },
        );
      }
    }

    // 2️ Delete booking
    await Booking.findByIdAndDelete(bookingId).session(session);

    // 3️ Commit
    await session.commitTransaction();
    session.endSession();

    successResponse(res, 200, "Booking deleted successfully");
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
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
    .populate("invoiceId")
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
    dateType = "checkin", // booking | stay | checkin
    sortBy = "createdAt",
    order = "desc",
    confirmationCode,
  } = req.query;

  const query = {};

  // ================= PARTNER AUTH =================
  if (req.user.role === "PARTNER") {
    if (!propertyId) {
      return next(new CustomError("propertyId is required for partner", 400));
    }

    const property = await Property.findOne({
      _id: propertyId,
      partnerId: req.user._id,
    });

    if (!property) {
      return next(new CustomError("Unauthorized access", 403));
    }
  }

  // ================= BASIC FILTERS =================
  if (status) query.status = status;
  if (paymentStatus) query.paymentStatus = paymentStatus;
  if (propertyId) query.propertyId = propertyId;
  if (confirmationCode) query.confirmationCode = confirmationCode;

  // ================= DATE FILTERING =================
  if (fromDate && toDate) {
    const from = normalizeDate(fromDate);
    const to = normalizeDate(toDate);

    if (isNaN(from) || isNaN(to)) {
      return next(new CustomError("Invalid date format", 400));
    }

    if (dateType === "booking") {
      // Booking created date
      query.createdAt = { $gte: from, $lte: to };
    } else if (dateType === "stay") {
      // Overlapping stay
      query.checkInDate = { $lt: to };
      query.checkOutDate = { $gt: from };
    } else {
      // Default: check-in range
      query.checkInDate = { $gte: from, $lte: to };
    }
  }

  // ================= PAGINATION =================
  const pageNum = Number(page);
  const limitNum = Number(limit);
  const skip = (pageNum - 1) * limitNum;

  // ================= SORT =================
  const sort = {
    [sortBy]: order === "asc" ? 1 : -1,
  };

  // ================= QUERY =================
  const [bookings, total] = await Promise.all([
    Booking.find(query)
      .populate("userId", "name email phone")
      .populate("propertyId", "name")
      .sort(sort)
      .skip(skip)
      .limit(limitNum),

    Booking.countDocuments(query),
  ]);

  successResponse(res, 200, "Bookings fetched successfully", {
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
    bookings,
  });
});

// booking money split  logic

export const updateGuestBookingStatus = asyncHandler(async (req, res, next) => {
  const partnerId = req.user._id;
  const { bookingId, bookingStatus } = req.body;

  if (!bookingId || !bookingStatus) {
    return next(
      new CustomError("bookingId and bookingStatus are required", 400),
    );
  }

  if (!["checkIn", "no-show"].includes(bookingStatus)) {
    return next(new CustomError("Invalid booking status", 400));
  }

  /* ---------------- FETCH BOOKING WITH PROPERTY ---------------- */

  const result = await Booking.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(bookingId),
        status: "confirmed",
      },
    },
    {
      $lookup: {
        from: "properties",
        localField: "propertyId",
        foreignField: "_id",
        as: "property",
      },
    },
    { $unwind: "$property" },
    {
      $match: {
        "property.partnerId": new mongoose.Types.ObjectId(partnerId),
      },
    },
    {
      $lookup: {
        from: "partnerplans",
        localField: "priceBreakdown.partnerPlanId",
        foreignField: "_id",
        as: "partnerPlan",
      },
    },
    {
      $unwind: "$partnerPlan",
    },
    {
      $project: {
        property: 0,
      },
    },
  ]);

  if (!result.length) {
    return next(new CustomError("Booking not found", 404));
  }

  const booking = result[0];

  if (booking.status !== "confirmed") {
    throw new CustomError("Booking already processed", 400);
  }

  /* ---------------- PAYMENT VALIDATION ---------------- */

  const checkIn = new Date(booking.checkInDate);

  // Calculate 24-hour deadline
  const deadline = new Date(checkIn.getTime() + 24 * 60 * 60 * 1000);

  // Current time
  const now = new Date();

  // Check if now is within allowed window
  if (now < checkIn || now > deadline) {
    return next(
      new CustomError(
        "Action allowed only within 24 hours of check-in date",
        400,
      ),
    );
  }

  /* ---------------- SAVE ---------------- */

  try {
    if (bookingStatus == "no-show") {
      //release inventorty logic...
      await releaseInventory(booking);

      if (booking.paymentMode == "PAY_NOW") {
        const response = await splitMoney(booking, partnerId);
        if (response.error) throw response.error;
      }
    } else {
      //check In
      const response = await splitMoney(booking, partnerId);
      if (response.error) throw response.error;
    }
  } catch (error) {
    console.log(error);
    return next(error);
  }

  await Booking.findByIdAndUpdate(booking._id, {
    status: bookingStatus,
  });

  successResponse(res, 200, "Booking status updated successfully", {
    bookingId: booking._id,
    status: bookingStatus,
  });
});

export const splitMoney = async (booking, partnerId) => {
  try {
    if (!booking?.partnerPlan) {
      throw new Error("Partner plan not found");
    }

    const partnerPlan = booking.partnerPlan;

    const baseAmount = booking.totalPrice - booking.priceBreakdown.gst_amount;

    const roomGST = booking.priceBreakdown.gst_amount || 0;

    let adminAmount = 0;
    let adminGST = 0;
    let partnerAmount = 0;
    let partnerGST = roomGST;

    /* ---------- PLAN CALCULATION ---------- */

    if (partnerPlan.PlanType === "COMMISSION") {
      adminAmount = (partnerPlan.commissionPercentage * baseAmount) / 100;

      const { gstAmount } = getGST(adminAmount);
      adminGST = gstAmount;

      partnerAmount = baseAmount - adminAmount - adminGST;
    } else {
      // SUBSCRIPTION
      partnerAmount = baseAmount;
    }

    /* ---------- FIND MONTH ---------- */

    const checkIn = new Date(booking.checkInDate);
    const payoutMonth = checkIn.getMonth() + 1;
    const payoutYear = checkIn.getFullYear();

    /* ---------- FIND OR CREATE WALLET ---------- */

    let wallet = await PartnerMonthlyPayoutModel.findOne({
      partnerId,
      payoutMonth,
      payoutYear,
    });

    if (!wallet) {
      wallet = await PartnerMonthlyPayoutModel.create({
        partnerId,
        payoutMonth,
        payoutYear,
        bookings: [],
      });
    }

    /* ---------- PREVENT DUPLICATE ENTRY ---------- */

    const alreadyExists = wallet.bookings.some(
      (b) => b.bookingId.toString() === booking._id.toString(),
    );

    if (alreadyExists) {
      throw new Error("Split already processed for this booking");
    }

    /* ---------- PUSH BOOKING ENTRY ---------- */

    wallet.bookings.push({
      bookingId: booking._id,
      partnerAmount,
      partner_gst: partnerGST,
      adminAmount,
      admin_gst: adminGST,
    });

    /* ---------- WALLET UPDATE ---------- */

    if (booking.paymentMode === "PAY_NOW") {
      // Admin collected → Admin must pay partner
      wallet.partnerWallet.payableAmount += partnerAmount + partnerGST;
    } else {
      // Partner collected → Partner must pay admin
      wallet.adminWallet.receivableAmount += adminAmount + adminGST;
    }

    await wallet.save();

    return {
      success: true,
      error: null,
    };
  } catch (error) {
    console.log("Split Error:", error);
    return {
      success: false,
      error,
    };
  }
};
export const splitCancellationMoney = async (booking, retainedAmount) => {
  try {
    if (!booking?.partnerPlan) {
      throw new Error("Partner plan not found");
    }

    const partnerPlan = booking.partnerPlan;

    const totalPrice = booking.totalPrice;
    const totalGST = booking.priceBreakdown.gst_amount || 0;
    const totalBase = totalPrice - totalGST;

    // proportion retained %
    const retainedPercentage = retainedAmount / totalPrice;

    // proportional split
    const retainedBase = totalBase * retainedPercentage;
    const retainedGST = totalGST * retainedPercentage;

    let adminAmount = 0;
    let adminGST = 0;
    let partnerAmount = 0;
    let partnerGST = retainedGST;

    /* ---------- PLAN CALCULATION ---------- */

    if (partnerPlan.PlanType === "COMMISSION") {
      adminAmount = (partnerPlan.commissionPercentage * retainedBase) / 100;

      const { gstAmount } = getGST(adminAmount);
      adminGST = gstAmount;

      partnerAmount = retainedBase - adminAmount - adminGST;
    } else {
      // SUBSCRIPTION
      partnerAmount = retainedBase;
    }

    /* ---------- WALLET UPDATE ---------- */

    const checkIn = new Date(booking.checkInDate);
    const payoutMonth = checkIn.getMonth() + 1;
    const payoutYear = checkIn.getFullYear();

    let wallet = await PartnerMonthlyPayoutModel.findOne({
      partnerId: booking.propertyId.partnerId,
      payoutMonth,
      payoutYear,
    });

    if (!wallet) {
      wallet = await PartnerMonthlyPayoutModel.create({
        partnerId: booking.propertyId.partnerId,
        payoutMonth,
        payoutYear,
        bookings: [],
      });
    }

    wallet.bookings.push({
      bookingId: booking._id,
      partnerAmount,
      partner_gst: partnerGST,
      adminAmount,
      admin_gst: adminGST,
    });

    wallet.partnerWallet.payableAmount += partnerAmount + partnerGST;

    await wallet.save();

    return { success: true };
  } catch (error) {
    console.log("Cancellation Split Error:", error);
    throw error;
  }
};

export const releaseInventory = async (booking) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const dates = getDatesBetween(
      normalizeDate(booking.checkInDate),
      normalizeDate(booking.checkOutDate),
    );

    for (const room of booking.rooms) {
      for (const date of dates) {
        const inventory = await RoomInventory.findOne({
          roomId: room.roomId,
          date,
        }).session(session);

        if (!inventory) continue;

        if (inventory.bookedRooms < room.quantity) {
          throw new Error(
            `Inventory underflow for room ${room.roomId} on ${date}`,
          );
        }

        inventory.bookedRooms -= room.quantity;

        await inventory.save({ session });
      }
    }

    await session.commitTransaction();
    session.endSession();

    return { success: true };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

//Invoice  controllers
