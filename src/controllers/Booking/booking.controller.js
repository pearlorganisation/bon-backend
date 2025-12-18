import Booking from "../../models/Listing/booking.model.js";
import Room from "../../models/Listing/room.model.js";
import Property from "../../models/Listing/property.model.js";
import asyncHandler from "../../middleware/asyncHandler.js";
import { sendEmail } from "../../utils/mail/mailer.js";
import CustomError from "../../utils/error/customError.js";
import mongoose from "mongoose";

const generateBookingId = () => {
  return `BK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
};

export const createBooking = async (req, res) => {
  try {
    const { roomId, checkIn, checkOut, guestDetails } = req.body;
    const userId = req.user._id;

    // 1️⃣ Validate required fields
    if (!roomId || !checkIn || !checkOut) {
      throw new Error("Room ID, Check-in, and Check-out dates are required.");
    }

    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // 2️⃣ Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error("Invalid date format.");
    }
    if (start < now) {
      throw new Error("Check-in date cannot be in the past.");
    }
    if (end <= start) {
      throw new Error("Check-out must be after check-in.");
    }

    // 3️⃣ Fetch room with populated property
    const room = await Room.findById(roomId).populate("propertyId");

    if (!room) throw new Error("Room not found.");
    if (!room.propertyId)
      throw new Error("This room is not linked to a valid property.");
    if (room.propertyId.status !== "active")
      throw new Error("Property is currently inactive.");

    // 4️⃣ Validate guest count
    const guests = guestDetails || req.body.guests || {};
    const totalGuests =
      (Number(guests.adults) || 1) + (Number(guests.children) || 0);

    if (totalGuests > room.capacity) {
      throw new Error(`Room capacity exceeded. Max allowed: ${room.capacity}`);
    }

    // 5️⃣ Check for existing bookings
    const existingBooking = await Booking.findOne({
      roomId,
      status: { $in: ["confirmed", "pending", "checked_in"] },
      $or: [{ checkIn: { $lt: end }, checkOut: { $gt: start } }],
    });

    if (existingBooking) {
      throw new Error("Room is already booked for these dates.");
    }

    // 6️⃣ Check for blocked dates
    if (room.blockedDates && room.blockedDates.length > 0) {
      const isBlocked = room.blockedDates.some((block) => {
        const blockStart = new Date(block.startDate);
        const blockEnd = new Date(block.endDate);
        return start < blockEnd && end > blockStart;
      });
      if (isBlocked) {
        throw new Error(
          "Room is under maintenance or blocked for these dates."
        );
      }
    }

    // 7️⃣ Calculate price
    const oneDay = 24 * 60 * 60 * 1000;
    const nights = Math.max(1, Math.round((end - start) / oneDay));
    let pricePerNight = room.pricePerNight;

    if (room.discount && room.discount > 0) {
      pricePerNight = pricePerNight - (pricePerNight * room.discount) / 100;
    }

    const totalAmount = pricePerNight * nights;

    // 8️⃣ Create and save booking
    const newBooking = new Booking({
      userId,
      roomId,
      propertyId: room.propertyId._id,
      bookingId: generateBookingId(),
      checkIn: start,
      checkOut: end,
      guestDetails: {
        adults: guests.adults || 1,
        children: guests.children || 0,
      },
      pricePerNight,
      totalNights: nights,
      totalAmount,
      status: "confirmed", // Or 'pending' if using payment gateway
    });

    await newBooking.save();

    // 9️⃣ Send response
    res.status(201).json({
      success: true,
      message: "Room booked successfully",
      booking: newBooking,
    });
  } catch (error) {
    console.error("Booking error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user._id })
      .populate({
        path: "propertyId",
        select: "name city images address",
      })
      .populate({
        path: "roomId",
        select: "name type images",
      })
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: bookings.length, bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getBookingDetail = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const bookingDetail = await Booking.findOne({
      _id: bookingId,
      userId: req.user._id,
    })
      .populate({
        path: "userId",
        select: "name email phoneNumber createdAt profileImageUrl", // ✅ FIXED
      })
      .populate({
        path: "propertyId",
        select: "name city images address",
      })
      .populate({
        path: "roomId",
        select: "name type images pricePerNight", // ❌ profileImageUrl removed (room doesn't have it)
      });

    if (!bookingDetail) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Booking timeline
    const bookingTimeline = [
      { title: "Booking created", date: bookingDetail.createdAt },
      {
        title: "Payment completed",
        date: bookingDetail.paymentCompletedAt || null,
      },
      {
        title: "Hotel confirmed",
        date: bookingDetail.hotelConfirmedAt || null,
      },
      { title: "User check-in", date: bookingDetail.checkIn },
      { title: "User check-out", date: bookingDetail.checkOut },
    ];

    // Final formatted response
    const formattedBooking = {
      bookingId: bookingDetail._id,
      checkIn: bookingDetail.checkIn,
      checkOut: bookingDetail.checkOut,
      guestDetails: bookingDetail.guestDetails || {},
      totalAmount: bookingDetail.totalAmount,
      tax: bookingDetail.tax || 0,
      status: bookingDetail.status,

      property: {
        name: bookingDetail.propertyId?.name || "N/A",
        city: bookingDetail.propertyId?.city || "N/A",
        address: bookingDetail.propertyId?.address || "N/A",
        images: bookingDetail.propertyId?.images || [],
      },

      room: {
        name: bookingDetail.roomId?.name || "N/A",
        type: bookingDetail.roomId?.type || "N/A",
        images: bookingDetail.roomId?.images || [],
        pricePerNight: bookingDetail.roomId?.pricePerNight || 0,
      },

      user: {
        name: bookingDetail.userId?.name || "Unknown",
        email: bookingDetail.userId?.email || "N/A",
        phone: bookingDetail.userId?.phoneNumber || "N/A", // ✅ FIXED
        registered: bookingDetail.userId?.createdAt || null,
        profileImageUrl: bookingDetail.userId?.profileImageUrl || null, // ✅ FIXED
      },

      paymentDetails: {
        amount: bookingDetail.amount || 0,
        tax: bookingDetail.tax || 0,
        total: bookingDetail.totalAmount || 0,
      },

      bookingTimeline,
    };

    res.status(200).json({ success: true, bookingDetail: formattedBooking });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const getPartnerBookings = async (req, res) => {
  try {
    const partnerId = req.user._id;
    const properties = await Property.find({ partnerId }).select("_id");
    if (!properties.length) {
      return res.status(200).json({ success: true, bookings: [] });
    }
    const propertyIds = properties.map((p) => p._id);
    const bookings = await Booking.find({ propertyId: { $in: propertyIds } })
      .populate("userId", "name email phone")
      .populate("roomId", "name type")
      .populate("propertyId", "name city")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: bookings.length, bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPartnerBookingByProperty = async (req, res) => {
  try {
    const partnerId = req.user._id;
    const propertyId = req.params.propertyId;

    const property = await Property.findOne({
      _id: propertyId,
      partnerId: partnerId,
    });

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found or not assigned to this partner",
      });
    }

    const bookings = await Booking.find({ propertyId })
      .populate("userId", "name email phone")
      .populate("roomId", "name type images")
      .populate("propertyId", "name city address")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ==========================================
// 4. Cancel Booking
// ==========================================
export const cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { reason } = req.body;
    const userId = req.user._id;
    const role = req.user.role;

    const booking = await Booking.findById(bookingId).populate("propertyId");

    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });
    }

    // Authorization Check
    let isAuthorized = false;

    // 1. User owns the booking
    if (role === "user" && booking.userId.toString() === userId.toString()) {
      isAuthorized = true;
    }
    // 2. Partner owns the property
    else if (
      role === "partner" &&
      booking.propertyId.partnerId.toString() === userId.toString()
    ) {
      isAuthorized = true;
    }
    // 3. Admin overrides
    else if (role === "admin") {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to cancel this booking.",
      });
    }

    // Status Check
    if (["cancelled", "checked_out", "rejected"].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Booking is already ${booking.status}`,
      });
    }

    booking.status = "cancelled";
    booking.cancelledBy = role;
    booking.cancellationReason = reason || "No reason provided";

    await booking.save();

    res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
      booking,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllBookingsAdmin = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("userId", "name email phoneNumber")
      .populate("roomId", "name type images")
      .populate("propertyId", "name city address partnerId")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

