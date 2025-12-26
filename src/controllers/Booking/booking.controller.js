import Booking from "../../models/Listing/booking.model.js";
import Room from "../../models/Listing/room.model.js";
import Property from "../../models/Listing/property.model.js";
import Razorpay from "razorpay";
import crypto from "crypto";

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const generateBookingId = () => {
  return `BK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
};

// 1. CREATE BOOKING & RAZORPAY ORDER
export const createBooking = async (req, res) => {
  try {
    const { roomId, checkIn, checkOut, guestDetails } = req.body;
    const userId = req.user._id;

    if (!roomId || !checkIn || !checkOut) {
      throw new Error("Room ID, Check-in, and Check-out dates are required.");
    }

    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const room = await Room.findById(roomId).populate("propertyId");

    if (!room) throw new Error("Room not found.");

    const oneDay = 24 * 60 * 60 * 1000;
    const nights = Math.max(1, Math.round((end - start) / oneDay));
    let pricePerNight = room.pricePerNight;
    if (room.discount > 0) {
      pricePerNight = pricePerNight - (pricePerNight * room.discount) / 100;
    }
    const totalAmount = pricePerNight * nights;

    // --- RAZORPAY ORDER CREATION ---
    const options = {
      amount: totalAmount * 100, // Razorpay works in paise (100 paise = 1 INR)
      currency: "INR",
      receipt: generateBookingId(),
    };

    const razorpayOrder = await razorpay.orders.create(options);

    if (!razorpayOrder) {
      throw new Error("Razorpay order creation failed.");
    }

    const newBooking = new Booking({
      userId,
      roomId,
      propertyId: room.propertyId._id,
      bookingId: options.receipt,
      checkIn: start,
      checkOut: end,
      guestDetails: {
        adults: guestDetails?.adults || 1,
        children: guestDetails?.children || 0,
      },
      pricePerNight,
      totalNights: nights,
      totalAmount,
      status: "pending", // Always pending until payment verified
      paymentInfo: {
        id: razorpayOrder.id, // This is the Razorpay Order ID
        status: "pending",
        method: "razorpay",
      },
    });

    await newBooking.save();
    // const checknewBooking = await newBooking.save();
    // console.log("await", checknewBooking);

    res.status(201).json({
      success: true,
      order: razorpayOrder, // Frontend needs this to open Razorpay UI
      booking: newBooking,
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// 2. VERIFY PAYMENT (The crucial step)
export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      // Find booking and update status
      const booking = await Booking.findOne({
        "paymentInfo.id": razorpay_order_id,
      });

      if (!booking) {
        return res
          .status(404)
          .json({ success: false, message: "Booking not found" });
      }

      booking.status = "confirmed";
      booking.paymentInfo.status = "paid";
      booking.paymentInfo.paymentId = razorpay_payment_id; // Save transaction ID
      await booking.save();

      res.status(200).json({
        success: true,
        message: "Payment Verified & Booking Confirmed",
      });
    } else {
      res.status(400).json({ success: false, message: "Invalid Signature" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
