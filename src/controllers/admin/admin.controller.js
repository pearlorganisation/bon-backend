import asyncHandler from "../../middleware/asyncHandler.js";
import CustomError from "../../utils/error/customError.js";
import Partner from "../../models/Partner/partner.model.js";
import Auth from "../../models/auth/auth.model.js";
import successResponse from "../../utils/error/successResponse.js";
import Admin from "../../models/Admin/admin.model.js";
import AdminSubscriptionPlan from "../../models/Admin/admin.subscription.model.js";
import { configDotenv } from "dotenv";
import { razorpay } from "../../config/razorpayConfig.js";
import PartnerMonthlyPayoutModel from "../../models/Partner/PartnerMonthlyPayout.model.js";
import Booking from "../../models/Listing/booking.model.js";
import PartnerPlan from "../../models/Partner/PartnerPlan.model.js";
import mongoose from "mongoose";
import Property from "../../models/Listing/property.model.js";

configDotenv();

export const getAllPartners = asyncHandler(async (req, res, next) => {
  if (req.user.role !== "ADMIN") {
    return next(new CustomError("only admin is allowed", 401));
  }

  const partners = await Auth.aggregate([
    { $match: { role: "PARTNER" } },

    {
      $lookup: {
        from: "partners",
        localField: "_id",
        foreignField: "userId",
        as: "partner",
      },
    },
    { $unwind: "$partner" },

    {
      $lookup: {
        from: "partnerplans",
        let: { partnerId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$partnerId", "$$partnerId"] },
                  { $eq: ["$planStatus", "ACTIVE"] },
                ],
              },
            },
          },
          { $limit: 1 },
        ],
        as: "plan",
      },
    },

    {
      $unwind: {
        path: "$plan",
        preserveNullAndEmptyArrays: true,
      },
    },

    {
      $addFields: {
        plan: {
          $ifNull: ["$plan", { PlanType: "NO_PLAN" }],
        },
      },
    },

    {
      $project: {
        password: 0,
        refresh_token: 0,
      },
    },
  ]);

  successResponse(res, 200, "successfully fetched partners", partners);
});

export const upsertGSTConfig = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  const { roomGSTSlabs, gstOnServices } = req.body;

  //  Role check
  if (req.user.role !== "ADMIN") {
    return next(new CustomError("Permission denied", 403));
  }

  //  Validate GST on services
  if (
    gstOnServices !== undefined &&
    (gstOnServices < 0 || gstOnServices > 100)
  ) {
    return next(new CustomError("Invalid GST on services", 400));
  }

  //  Validate room slabs
  if (roomGSTSlabs) {
    if (!Array.isArray(roomGSTSlabs) || roomGSTSlabs.length === 0) {
      return next(
        new CustomError("Room GST slabs must be a non-empty array", 400)
      );
    }

    // sort slabs by upto
    roomGSTSlabs.sort((a, b) => a.upto - b.upto);

    for (let i = 0; i < roomGSTSlabs.length; i++) {
      const slab = roomGSTSlabs[i];

      if (
        typeof slab.upto !== "number" ||
        typeof slab.rate !== "number" ||
        slab.upto <= 0 ||
        slab.rate < 0 ||
        slab.rate > 100
      ) {
        return next(new CustomError("Invalid slab format", 400));
      }

      // ensure increasing order
      if (i > 0 && slab.upto <= roomGSTSlabs[i - 1].upto) {
        return next(
          new CustomError("Slabs must be in strictly increasing order", 400)
        );
      }
    }
  }

  // 🛠 Build update object dynamically
  const updateData = {};

  if (roomGSTSlabs) updateData.roomGSTSlabs = roomGSTSlabs;
  if (gstOnServices !== undefined) updateData.gstOnServices = gstOnServices;

  const admin = await Admin.findOneAndUpdate({ userId }, updateData, {
    new: true,
    upsert: true,
  });

  successResponse(res, 200, "GST configuration updated successfully", admin);
});

// platform  subscription and commision plan

export const upsertCommissionRange = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  const { min, max } = req.body;

  if (req.user.role != "ADMIN")
    return next(new CustomError("permission denied", 400));

  if (min < 0 || max > 100 || min >= max) {
    return next(new CustomError("Invalid commission range", 400));
  }

  const admin = await Admin.findOneAndUpdate(
    { userId },
    {
      commission: { min, max },
    },
    { new: true, upsert: true }
  );

  successResponse(res, 200, "Commission range updated successfully");
});

export const createSubscriptionPlan = asyncHandler(async (req, res, next) => {
  if (req.user.role !== "ADMIN") {
    return next(new CustomError("permission denied", 401));
  }

  let { name, price, durationDays } = req.body;

  if (!name || !price || !durationDays) {
    return next(
      new CustomError("name, price and durationDays are required", 400)
    );
  }

  name = name.trim().toUpperCase();

  const isExist = await AdminSubscriptionPlan.findOne({ name });
  if (isExist) {
    return next(
      new CustomError("Subscription with this name already exists", 400)
    );
  }

  const plan = await AdminSubscriptionPlan.create({
    name,
    price,
    durationDays,
    updatedBy: req.user._id,
  });

  successResponse(res, 201, "Subscription plan created", plan);
});

export const updateSubscriptionPlan = asyncHandler(async (req, res, next) => {
  if (req.user.role !== "ADMIN") {
    return next(new CustomError("permission denied", 401));
  }

  const { planId } = req.params;
  const plan = await AdminSubscriptionPlan.findById(planId);

  if (!plan) {
    return next(new CustomError("No plan found", 404));
  }

  if (req.body?.name) {
    const name = req.body.name.trim().toUpperCase();

    const isExist = await AdminSubscriptionPlan.findOne({
      name,
      _id: { $ne: plan._id },
    });

    if (isExist) {
      return next(
        new CustomError("Subscription with this name already exists", 400)
      );
    }

    plan.name = name;
  }

  if (req.body?.price !== undefined) {
    plan.price = req.body.price;
  }

  if (req.body?.durationDays !== undefined) {
    plan.durationDays = req.body.durationDays;
  }
  if (req.body?.isActive !== undefined) {
    plan.isActive = req.body.isActive;
  }
  await plan.save();

  successResponse(res, 200, "Subscription plan updated", plan);
});

export const getPlatformPlans = asyncHandler(async (req, res, next) => {
  console.log(req.user, "check");
  const result = await Admin.aggregate([
    {
      $lookup: {
        from: "adminsubscriptionplans",
        localField: "userId",
        foreignField: "updatedBy",
        as: "subscriptions",
      },
    },
    {
      $project: {
        commission: 1,
        subscriptions: 1,
      },
    },
  ]);

  if (!result.length) {
    return next(new CustomError("Platform plans not configured", 404));
  }

  const platformPlans = {
    commission: result[0].commission,
    subscriptions: [],
  };

  if (req.user.role === "PARTNER") {
    platformPlans.subscriptions = result[0].subscriptions.filter(
      (sub) => sub.isActive === true
    );
  } else {
    platformPlans.subscriptions = result[0].subscriptions;
  }

  successResponse(res, 200, "Plans fetched successfully", platformPlans);
});

// partner payout api for monthly payouts

export const releasePartnerMonthlyPayout = asyncHandler(
  async (req, res, next) => {
    const { partnerId, date } = req.params;

    if (!mongoose.Types.ObjectId.isValid(partnerId)) {
      return next(new CustomError("Invalid partnerId", 400));
    }

    /* ---------- GET PREVIOUS MONTH ---------- */
    const dateObj = new Date(date);
    if (isNaN(dateObj)) {
      return next(new CustomError("Invalid date format", 400));
    }
    // const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1);
    const payoutMonth = prevMonthDate.getMonth() + 1;
    const payoutYear = prevMonthDate.getFullYear();

    /* ---------- FIND PAYOUT RECORD ---------- */
    const payout = await PartnerMonthlyPayoutModel.findOne({
      partnerId,
      payoutMonth,
      payoutYear,
    });

    if (!payout) return next(new CustomError("No payout record found", 404));

    if (payout.partnerWallet.status === "paid")
      return next(new CustomError("Payout already completed", 400));

    if (payout.partnerWallet.payableAmount <= 0)
      return next(new CustomError("No payable amount", 400));

    const partner = await Partner.findOne({ userId: partnerId });

    if (!partner?.razorpay?.fundAccountId)
      return next(new CustomError("Fund account not configured", 400));

    /* ---------- CREATE PAYOUT ---------- */
    let payoutResponse;

    try {
      payoutResponse = await razorpay.payouts.create({
        account_number: process.env.RAZORPAY_ACCOUNT_NUMBER,
        fund_account_id: partner.razorpay.fundAccountId,
        amount: Math.round(payout.partnerWallet.payableAmount * 100),
        currency: "INR",
        mode: "IMPS",
        purpose: "payout",
        queue_if_low_balance: false,
        reference_id: payout._id.toString(),
        narration: `Monthly payout ${payoutMonth}-${payoutYear}`,
      });
    } catch (err) {
      return next(
        new CustomError(
          err?.error?.description || "Failed to create payout",
          502
        )
      );
    }

    /* ---------- CHECK INITIAL STATUS ---------- */

    const razorpayStatus = payoutResponse.status;

    payout.partnerWallet.razorpayPayoutId = payoutResponse.id;
    payout.partnerWallet.razorpayStatus = razorpayStatus;
    payout.partnerWallet.razorpayStatusDetail =
      payoutResponse?.status_details?.description;

    if (razorpayStatus === "failed") {
      payout.partnerWallet.status = "failed";
      await payout.save();
      return next(
        new CustomError(
          payout.partnerWallet.razorpayStatusDetail ||
            "Payout failed instantly",
          400
        )
      );
    }

    payout.partnerWallet.status = "pending";

    await payout.save();

    return successResponse(res, 200, "Payout initiated", {
      payoutId: payoutResponse.id,
      status: razorpayStatus,
      razorpayStatusDetail: payout.partnerWallet.razorpayStatusDetail,
    });
  }
);

export const razorpayPayoutWebhook = async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    /* ---------- 1️ VERIFY SIGNATURE ---------- */

    const signature = req.headers["x-razorpay-signature"];

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(req.body)
      .digest("hex");

    if (signature !== expectedSignature) {
      console.error("Invalid Razorpay webhook signature");
      return res.status(400).json({ message: "Invalid signature" });
    }

    /* ---------- 2️ PARSE EVENT ---------- */

    const event = JSON.parse(req.body.toString());

    const eventType = event.event;
    const payoutEntity = event?.payload?.payout?.entity;

    if (!payoutEntity) {
      return res.status(200).json({ received: true });
    }

    const payoutId = payoutEntity.id;
    const razorpayStatus = payoutEntity.status;

    /* ---------- 3️ FIND PAYOUT IN DB ---------- */

    const monthlyPayout = await PartnerMonthlyPayoutModel.findOne({
      "partnerWallet.razorpayPayoutId": payoutId,
    });

    if (!monthlyPayout) {
      // Not our payout — ignore safely
      return res.status(200).json({ received: true });
    }

    /* ---------- 4️ UPDATE RAZORPAY STATUS ---------- */

    monthlyPayout.partnerWallet.razorpayStatus = razorpayStatus;
    monthlyPayout.partnerWallet.razorpayStatusDetail =
      payoutEntity?.status_details?.description || null;

    /* ---------- 5️ HANDLE EVENTS SAFELY ---------- */

    switch (eventType) {
      case "payout.processed":
        if (monthlyPayout.partnerWallet.status !== "paid") {
          monthlyPayout.partnerWallet.status = "paid";
          monthlyPayout.partnerWallet.paidAt = new Date();
        }
        break;

      case "payout.failed":
      case "payout.reversed":
      case "payout.rejected":
        monthlyPayout.partnerWallet.status = "failed";
        break;

      case "payout.queued":
      case "payout.pending":
      case "payout.processing":
        if (monthlyPayout.partnerWallet.status !== "paid") {
          monthlyPayout.partnerWallet.status = "processing";
        }
        break;

      default:
        // Ignore unrelated events safely
        break;
    }

    await monthlyPayout.save();

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Webhook Error:", error);
    return res.status(500).json({ message: "Webhook error" });
  }
};

export const confirmPartnerMonthlyPayout = asyncHandler(
  async (req, res, next) => {
    const { partnerId, date } = req.query;
  
    /* ---------- VALIDATE PARTNER ---------- */
    if (!mongoose.Types.ObjectId.isValid(partnerId)) {
      return next(new CustomError("Invalid partnerId", 400));
    }

    /* ---------- PARSE DATE ---------- */
    let dateObj = date ? new Date(date) : new Date();

    if (isNaN(dateObj)) {
      return next(new CustomError("Invalid date format", 400));
    }

    const payoutMonth = dateObj.getMonth() + 1;
    const payoutYear = dateObj.getFullYear();

    /* ---------- FIND PAYOUT ---------- */
    const payout = await PartnerMonthlyPayoutModel.findOne({
      partnerId,
      payoutMonth,
      payoutYear,
    });

    if (!payout) {
      return next(
        new CustomError(`No payout found for ${payoutMonth}/${payoutYear}`, 404)
      );
    }

    if (!payout.partnerWallet) {
      return next(new CustomError("Partner wallet not found", 400));
    }

    /* ---------- VALIDATIONS ---------- */
    if (payout.partnerWallet.payableAmount <= 0) {
      return next(
        new CustomError(
          `No payable amount for ${payoutMonth}/${payoutYear}`,
          400
        )
      );
    }

    if (payout.partnerWallet.status === "paid") {
      return next(
        new CustomError(
          `Payout already marked as paid for ${payoutMonth}/${payoutYear}`,
          400
        )
      );
    }

    /* ---------- MANUAL UPDATE ---------- */

    payout.partnerWallet.status = "paid";
    payout.partnerWallet.paidAt = new Date();

    await payout.save();

    /* ---------- RESPONSE ---------- */
    return successResponse(res, 200, "Partner payout marked as paid manually", {
      partnerId,
      payoutMonth,
      payoutYear,
      payableAmount: payout.partnerWallet.payableAmount,
      status: payout.partnerWallet.status,
    });
  }
);

export const confirmAdminMonthlyPayout = asyncHandler(
  async (req, res, next) => {
    const { date, partnerId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(partnerId)) {
      return next(new CustomError("Invalid partnerId", 400));
    }

    let dateObj = date ? new Date(date) : new Date();

    if (isNaN(dateObj)) {
      return next(new CustomError("Invalid date format", 400));
    }

    const payoutMonth = dateObj.getMonth() + 1;
    const payoutYear = dateObj.getFullYear();

    const monthlyPayout = await PartnerMonthlyPayoutModel.findOne({
      partnerId,
      payoutMonth,
      payoutYear,
    });

    if (!monthlyPayout) {
      return next(
        new CustomError(
          `No record found for ${payoutMonth}, ${payoutYear}`,
          404
        )
      );
    }

    if (!monthlyPayout.adminWallet) {
      return next(new CustomError("Admin wallet not found", 400));
    }

    if (monthlyPayout.adminWallet.receivableAmount <= 0) {
      return next(
        new CustomError(
          `For ${payoutMonth}/${payoutYear}, receivable amount is ${monthlyPayout.adminWallet.receivableAmount}`,
          400
        )
      );
    }

    if (monthlyPayout.adminWallet.status === "received") {
      return next(
        new CustomError(
          `For ${payoutMonth}/${payoutYear}, amount already received`,
          400
        )
      );
    }

    monthlyPayout.adminWallet.status = "received";
    await monthlyPayout.save();

    return successResponse(
      res,
      200,
      "Admin wallet status updated successfully"
    );
  }
);

// admin  Payment & Finance dashborad  controllers

export const getPartnerMonthlyPayouts = asyncHandler(async (req, res, next) => {
  const date = req.query.date;

  let dateObj;

  if (date) {
    dateObj = new Date(date);
    if (isNaN(dateObj)) {
      return next(new CustomError("Invalid date format", 400));
    }
  } else {
    dateObj = new Date();
  }

  const month = dateObj.getMonth() + 1;
  const year = dateObj.getFullYear();

  const pipeline = [
    {
      $match: {
        role: "PARTNER",
        isVerified: true,
      },
    },
    {
      $lookup: {
        from: "partners",
        localField: "_id",
        foreignField: "userId",
        as: "partner",
      },
    },
    {
      $unwind: "$partner",
    },
    {
      $match: {
        "partner.isPanVerified": true,
        "partner.isVerified": true,
      },
    },
    {
      $lookup: {
        from: "partnermonthlypayouts",
        let: { partnerId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$partnerId", "$$partnerId"] },
                  { $eq: ["$payoutYear", year] },
                  { $eq: ["$payoutMonth", month] },
                ],
              },
            },
          },
        ],
        as: "partnerMonthlyPayout",
      },
    },
    {
      $unwind: {
        path: "$partnerMonthlyPayout",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        password: 0,
        refresh_token: 0,
      },
    },
  ];

  const partnersMonthlyPayouts = await Auth.aggregate(pipeline);

  return successResponse(
    res,
    200,
    `Successfully fetched partner payouts for ${month}/${year}`,
    partnersMonthlyPayouts
  );
});

export const getAdminMonthlyFinance = asyncHandler(async (req, res, next) => {
  const date = req.query.date;

  let dateObj;

  if (date) {
    dateObj = new Date(date);
    if (isNaN(dateObj)) {
      return next(new CustomError("Invalid date format", 400));
    }
  } else {
    dateObj = new Date();
  }

  const month = dateObj.getMonth() + 1;
  const year = dateObj.getFullYear();

  const result = await PartnerMonthlyPayoutModel.aggregate([
    {
      $match: {
        payoutMonth: month,
        payoutYear: year,
      },
    },

    {
      $facet: {
        /* -----------------------------------
           1. BOOKING STATS (GST + AMOUNT)
        ----------------------------------- */
        bookingStats: [
          { $unwind: "$bookings" },
          {
            $group: {
              _id: null,
              // totalAdminGST: { $sum: "$bookings.admin_gst" },
              // totalAdminAmount: { $sum: "$bookings.adminAmount" },
              totalBookings: { $sum: 1 },
            },
          },
        ],

        /* -----------------------------------
           2. PARTNER PAYOUT SUMMARY
        ----------------------------------- */
        partnerPayout: [
          {
            $group: {
              _id: null,
              totalPaid: {
                $sum: {
                  $cond: [
                    { $eq: ["$partnerWallet.status", "paid"] },
                    "$partnerWallet.payableAmount",
                    0,
                  ],
                },
              },
              totalPending: {
                $sum: {
                  $cond: [
                    { $ne: ["$partnerWallet.status", "paid"] },
                    "$partnerWallet.payableAmount",
                    0,
                  ],
                },
              },
            },
          },
        ],

        /* -----------------------------------
           3. ADMIN GROSS PROFIT
        ----------------------------------- */
        adminProfit: [
          { $unwind: "$bookings" },

          {
            $group: {
              _id: "$_id",

              adminAmount: { $sum: "$bookings.adminAmount" },
              adminGST: { $sum: "$bookings.admin_gst" },

              receivableAmount: { $first: "$adminWallet.receivableAmount" },
              receivableGST: { $first: "$adminWallet.receivableGST" },
              status: { $first: "$adminWallet.status" },
            },
          },

          {
            $project: {
              /* ---------------- GROSS ---------------- */
              gross: {
                $subtract: [
                  { $add: ["$adminAmount", "$adminGST"] },
                  {
                    $cond: [
                      { $eq: ["$status", "pending"] },
                      { $add: ["$receivableAmount", "$receivableGST"] },
                      0,
                    ],
                  },
                ],
              },

              /* ---------------- PROFIT ---------------- */
              profit: {
                $cond: [
                  { $eq: ["$status", "pending"] },

                  {
                    $subtract: [
                      {
                        $subtract: [
                          { $add: ["$adminAmount", "$adminGST"] },
                          {
                            $add: ["$receivableAmount", "$receivableGST"],
                          },
                        ],
                      },
                      { $subtract: ["$adminGST", "$receivableGST"] },
                    ],
                  },

                  "$adminAmount",
                ],
              },

              /* ---------------- CURRENT GST ---------------- */
              currentGST: {
                $cond: [
                  { $eq: ["$status", "pending"] },
                  { $subtract: ["$adminGST", "$receivableGST"] }, // pending case
                  "$adminGST", // received case
                ],
              },
            },
          },

          {
            $group: {
              _id: null,
              totalGrossAmount: { $sum: "$gross" },
              totalProfit: { $sum: "$profit" },
              totalCurrentGST: { $sum: "$currentGST" },
            },
          },
        ],
        /* -----------------------------------
           4. total monthly revenue 
        ----------------------------------- */
        totalRevenue: [
          { $unwind: "$bookings" },
          {
            $group: {
              _id: null,
              totalRevenue: {
                $sum: {
                  $add: [
                    "$bookings.partnerAmount",
                    "$bookings.partner_gst",
                    "$bookings.adminAmount",
                    "$bookings.admin_gst",
                  ],
                },
              },
            },
          },
        ],
      },
    },
  ]);

  // Safely extract results
  const bookingStats = result[0]?.bookingStats[0] || {};
  const partnerPayout = result[0]?.partnerPayout[0] || {};
  const adminProfit = result[0]?.adminProfit[0] || {};
  const totalRevenue = result[0]?.totalRevenue[0] || {};

  const data = {
    /* Booking */
    totalRevenue: totalRevenue.totalRevenue || 0,

    // totalAdminAmount: bookingStats.totalAdminAmount || 0,
    totalBookings: bookingStats.totalBookings || 0,

    /* Partner */
    partnerPaidAmount: partnerPayout.totalPaid || 0,
    partnerPendingAmount: partnerPayout.totalPending || 0,

    /* Admin */
    totalGrossAmount: adminProfit.totalGrossAmount || 0,
    totalNetProfit: adminProfit.totalProfit || 0,
    currentAdminGST: adminProfit.currentGST || 0,
  };

  return successResponse(res, 200, `Finance report for ${month}/${year}`, data);
});

export const getWeeklySalesFromBookings = asyncHandler(
  async (req, res, next) => {
    const date = req.query.date;

    let dateObj = date ? new Date(date) : new Date();

    if (isNaN(dateObj)) {
      return next(new CustomError("Invalid date format", 400));
    }

    const month = dateObj.getMonth() + 1;
    const year = dateObj.getFullYear();

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const result = await Booking.aggregate([
      {
        $match: {
        paymentStatus: "paid",
          createdAt: {
            $gte: startDate,
            $lt: endDate,
          },
        },
      },

      {
        $group: {
          _id: {
            dayOfWeek: { $dayOfWeek: "$createdAt" },
          },
          totalRevenue: { $sum: "$totalPrice" },
          totalBookings: { $sum: 1 },
        },
      },

      {
        $project: {
          _id: 0,
          dayOfWeek: "$_id.dayOfWeek",
          totalRevenue: 1,
          totalBookings: 1,
        },
      },
    ]);

    /* ---------- FORMAT MON → SUN ---------- */

    const daysMap = {
      1: "Sun",
      2: "Mon",
      3: "Tue",
      4: "Wed",
      5: "Thu",
      6: "Fri",
      7: "Sat",
    };

    const orderedDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    const formatted = orderedDays.map((day) => {
      const found = result.find((r) => daysMap[r.dayOfWeek] === day);

      return {
        day,
        totalRevenue: found ? found.totalRevenue : 0,
        totalBookings: found ? found.totalBookings : 0,
      };
    });

    return successResponse(
      res,
      200,
      `Weekly sales (GMV) for ${month}/${year}`,
      formatted
    );
  }
);

export const getTopPerformerHotels = asyncHandler(async (req, res, next) => {
  const date = req.query.date;

  let dateObj = date ? new Date(date) : new Date();

  if (isNaN(dateObj)) {
    return next(new CustomError("Invalid date format", 400));
  }

  const month = dateObj.getMonth() + 1;
  const year = dateObj.getFullYear();

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  const result = await Booking.aggregate([
    {
      $match: {
        status: "confirmed",
        createdAt: {
          $gte: startDate,
          $lt: endDate,
        },
      },
    },

    /* ---------- JOIN PROPERTY ---------- */
    {
      $lookup: {
        from: "properties",
        localField: "propertyId",
        foreignField: "_id",
        as: "property",
      },
    },
    { $unwind: "$property" },

    /* ---------- GROUP BY PROPERTY ---------- */
    {
      $group: {
        _id: "$property._id",

        propertyName: { $first: "$property.name" },
        city: { $first: "$property.city" },
        state: { $first: "$property.state" },
        country: { $first: "$property.country" },

        totalRevenue: { $sum: "$totalPrice" },
        totalBookings: { $sum: 1 },
      },
    },

    /* ---------- SORT ---------- */
    {
      $sort: { totalRevenue: -1 },
    },
  ]);

  return successResponse(
    res,
    200,
    `Top performing hotels for ${month}/${year}`,
    result
  );
});

export const getMonthlyRefundsData = asyncHandler(async (req, res, next) => {
  const date = req.query.date;

  let dateObj = date ? new Date(date) : new Date();

  if (isNaN(dateObj)) {
    throw new CustomError("Invalid date format", 400);
  }

  const month = dateObj.getMonth() + 1;
  const year = dateObj.getFullYear();

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  const result = await Booking.aggregate([
    /* ---------- FILTER BOOKINGS ---------- */
    {
      $match: {
        status: "cancelled",
        paymentStatus: {
          $in: ["refund_pending", "refunded", "refund_failed"],
        },
        createdAt: {
          $gte: startDate,
          $lt: endDate,
        },
      },
    },
    {
      $lookup: {
        from: "auths", //  collection name (check in DB, usually lowercase plural)
        localField: "userId",
        foreignField: "_id",
        as: "Customer",
      },
    },
    {
      $unwind: {
        path: "$Customer",
        preserveNullAndEmptyArrays: true,
      },
    },

    /* ---------- LOOKUP USER (cancelledBy) ---------- */
    {
      $lookup: {
        from: "auths", //  collection name (check in DB, usually lowercase plural)
        localField: "cancellation.cancelledBy",
        foreignField: "_id",
        as: "cancelledByUser",
      },
    },

    /* ---------- UNWIND ---------- */
    {
      $unwind: {
        path: "$cancelledByUser",
        preserveNullAndEmptyArrays: true,
      },
    },

    /* ---------- PROJECT REQUIRED DATA ---------- */
    {
      $project: {
        _id: 1,
        Customer: {
          _id: "$Customer._id",
          name: "$Customer.name",
        },
        propertyId: 1,
        checkInDate: 1,
        checkOutDate: 1,
        totalPrice: 1,
        paymentStatus: 1,
        paymentMode: 1,
        "cancellation.cancellationDate": 1,
        "cancellation.refundAmount": 1,
        "cancellation.reason": 1,

        cancelledBy: {
          _id: "$cancelledByUser._id",
          name: "$cancelledByUser.name", // adjust field
          role: "$cancelledByUser.role",
        },
      },
    },

    /* ---------- GROUP (TOTAL REFUND ONLY FOR refunded) ---------- */
    {
      $group: {
        _id: null,
        bookings: { $push: "$$ROOT" },

        totalRefundAmount: {
          $sum: {
            $cond: [
              { $eq: ["$paymentStatus", "refunded"] },
              "$cancellation.refundAmount",
              0,
            ],
          },
        },

        // totalRefundedBookings: {
        //   $sum: {
        //     $cond: [{ $eq: ["$paymentStatus", "refunded"] }, 1, 0],
        //   },
        // },
      },
    },

    /* ---------- CLEAN RESPONSE ---------- */
    {
      $project: {
        _id: 0,
        bookings: 1,
        totalRefundAmount: 1,
      },
    },
  ]);

  return successResponse(
    res,
    200,
    "Monthly refund data fetched",
    result[0] || {
      bookings: [],
      totalRefundAmount: 0,
    }
  );
});

export const getMonthlySubscriptionsData = asyncHandler(
  async (req, res, next) => {
    const date = req.query.date;
    let dateObj = date ? new Date(date) : new Date();

    if (isNaN(dateObj)) {
      throw new CustomError("Invalid date format", 400);
    }

    const month = dateObj.getMonth() + 1;
    const year = dateObj.getFullYear();

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const result = await PartnerPlan.aggregate([
      {
        $match: {
          PlanType: "SUBSCRIPTION",
          planStatus: { $in: ["ACTIVE", "UPCOMING"] },
          createdAt: {
            $gte: startDate,
            $lt: endDate,
          },
        },
      },

      /* ---------------- PARTNER LOOKUP ---------------- */
      {
        $lookup: {
          from: "auths",
          localField: "partnerId",
          foreignField: "_id",
          as: "partner",
        },
      },
      { $unwind: "$partner" },

      /* ---------------- PLAN LOOKUP ---------------- */
      {
        $lookup: {
          from: "adminsubscriptionplans",
          localField: "subscriptionPlanId",
          foreignField: "_id",
          as: "subscriptionPlan",
        },
      },
      { $unwind: "$subscriptionPlan" },

      /* ---------------- FACET ---------------- */
      {
        $facet: {
          /* -------- TOTAL AMOUNT -------- */
          totalSubscriptionAmount: [
            {
              $group: {
                _id: null,
                total: { $sum: "$subscriptionPayment.totalAmount" },
              },
            },
          ],
          /* -------- TOTAL gst -------- */
          totalSubscriptionGST: [
            {
              $group: {
                _id: null,
                total: { $sum: "$subscriptionPayment.gstAmount" },
              },
            },
          ],

          /* -------- PARTNER DETAILS -------- */
          partnerDetails: [
            {
              $project: {
                _id: 0,

                partnerId: "$partner._id",
                name: "$partner.name",
                email: "$partner.email",
                address: "$partner.address",
                city: "$partner.city",

                planName: "$subscriptionPlan.name",
                price: "$subscriptionPlan.price",
                durationDays: "$subscriptionPlan.durationDays",
                subscriptionPayment:1,
                planStatus: 1,
                startDate: 1,
                endDate: 1,
              },
            },
          ],
        },
      },
    ]);

    /* ---------------- SAFE EXTRACTION ---------------- */
    const totalAmount = result[0]?.totalSubscriptionAmount[0]?.total || 0;

    const partnerDetails = result[0]?.partnerDetails || [];

    return successResponse(res, 200, `Subscription data for ${month}/${year}`, {
      totalSubscriptionAmount: totalAmount,
      partners: partnerDetails,
    });
  }
);

//Analytics & Reports

export const getYearly_Revenue_Tax_Data = asyncHandler(
  async (req, res, next) => {
    const date = req.query.date;

    let dateObj = date ? new Date(date) : new Date();

    if (isNaN(dateObj)) {
      throw new CustomError("Invalid date format", 400);
    }

    const year = dateObj.getFullYear();

    const result = await PartnerMonthlyPayoutModel.aggregate([
      {
        $match: {
          payoutYear: year,
        },
      },

      /* ---------------- UNWIND BOOKINGS ---------------- */
      { $unwind: "$bookings" },

      /* ---------------- GROUP PER DOC ---------------- */
      {
        $group: {
          _id: {
            payoutId: "$_id",
            month: "$payoutMonth",
          },

          adminAmount: { $sum: "$bookings.adminAmount" },
          adminGST: { $sum: "$bookings.admin_gst" },

          receivableAmount: { $first: "$adminWallet.receivableAmount" },
          receivableGST: { $first: "$adminWallet.receivableGST" },
          status: { $first: "$adminWallet.status" },
        },
      },

      /* ---------------- APPLY YOUR PROFIT + GST LOGIC ---------------- */
      {
        $project: {
          month: "$_id.month",

          profit: {
            $cond: [
              { $eq: ["$status", "pending"] },

              {
                $subtract: [
                  {
                    $subtract: [
                      { $add: ["$adminAmount", "$adminGST"] },
                      {
                        $add: ["$receivableAmount", "$receivableGST"],
                      },
                    ],
                  },
                  { $subtract: ["$adminGST", "$receivableGST"] },
                ],
              },

              "$adminAmount",
            ],
          },

          currentGST: {
            $cond: [
              { $eq: ["$status", "pending"] },
              { $subtract: ["$adminGST", "$receivableGST"] },
              "$adminGST",
            ],
          },
        },
      },

      /* ---------------- FINAL GROUP BY MONTH ---------------- */
      {
        $group: {
          _id: "$month",
          totalProfit: { $sum: "$profit" },
          totalGST: { $sum: "$currentGST" },
        },
      },

      /* ---------------- FORMAT ---------------- */
      {
        $project: {
          _id: 0,
          month: "$_id",
          totalProfit: 1,
          totalGST: 1,
        },
      },

      { $sort: { month: 1 } },
    ]);

    /* ---------------- FILL MISSING MONTHS ---------------- */
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const fullYearData = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const found = result.find((r) => r.month === month);

      return {
        month,
        monthName : monthNames[i],
        totalProfit: found?.totalProfit || 0,
        totalGST: found?.totalGST || 0,
      };
    });

    return successResponse(
      res,
      200,
      `Yearly revenue & GST report for ${year}`,
      fullYearData
    );
  }
);

export const getMonthlyHotelsData = asyncHandler(async (req, res, next) => {
  const date = req.query.date;
  let dateObj = date ? new Date(date) : new Date();

  if (isNaN(dateObj)) {
    throw new CustomError("Invalid date format", 400);
  }

  const month = dateObj.getMonth() + 1;
  const year = dateObj.getFullYear();

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  const result = await Property.aggregate([
    {
      $facet: {
        /* ---------------- TOTAL HOTELS ---------------- */
        totalHotels: [
          {
            $count: "total",
          },
        ],

        /* ---------------- ACTIVE HOTELS ---------------- */
        activeHotels: [
          {
            $match: { status: "active" },
          },
          {
            $count: "total",
          },
        ],

        /* ---------------- NEW HOTELS THIS MONTH ---------------- */
        newHotels: [
          {
            $match: {
              createdAt: {
                $gte: startDate,
                $lt: endDate,
              },
            },
          },
          {
            $count: "total",
          },
        ],
      },
    },
  ]);

  /* ---------------- SAFE EXTRACTION ---------------- */
  const totalHotels = result[0]?.totalHotels[0]?.total || 0;
  const activeHotels = result[0]?.activeHotels[0]?.total || 0;
  const newHotels = result[0]?.newHotels[0]?.total || 0;

  return successResponse(res, 200, `Hotel stats for ${month}/${year}`, {
    totalHotels,
    activeHotels,
    newHotels,
  });
});

export const getMonthlyCustomerData = asyncHandler(async (req, res, next) => {
  const date = req.query.date;
  let dateObj = date ? new Date(date) : new Date();

  if (isNaN(dateObj)) {
    throw new CustomError("Invalid date format", 400);
  }

  const month = dateObj.getMonth() + 1;
  const year = dateObj.getFullYear();

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  const result = await Auth.aggregate([
    {
      $match: {
        role: "CUSTOMER",
        isVerified: true,
      },
    },

    {
      $facet: {
        /* ---------------- TOTAL CUSTOMERS ---------------- */
        totalCustomers: [
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
            },
          },
        ],

        /* ---------------- NEW CUSTOMERS ---------------- */
        newCustomers: [
          {
            $match: {
              createdAt: {
                $gte: startDate,
                $lt: endDate,
              },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
            },
          },
        ],

        /* ---------------- AVG STAY DAYS ---------------- */
        avgStay: [
          {
            $lookup: {
              from: "bookings",
              let: { userId: "$_id" },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ["$userId", "$$userId"] },
                    checkInDate: { $gte: startDate, $lt: endDate },
                  },
                },
              ],
              as: "bookings",
            },
          },
          { $unwind: "$bookings" },

          {
            $project: {
              stayDays: {
                $divide: [
                  {
                    $subtract: [
                      "$bookings.checkOutDate",
                      "$bookings.checkInDate",
                    ],
                  },
                  1000 * 60 * 60 * 24,
                ],
              },
            },
          },

          {
            $group: {
              _id: null,
              avgStayDays: { $avg: "$stayDays" },
            },
          },
        ],
      },
    },
  ]);

  /* ---------------- SAFE EXTRACTION ---------------- */
  const totalCustomers = result[0]?.totalCustomers[0]?.total || 0;
  const newCustomers = result[0]?.newCustomers[0]?.total || 0;
  const avgStayDays = result[0]?.avgStay[0]?.avgStayDays || 0;

  return successResponse(res, 200, `Customer stats for ${month}/${year}`, {
    totalCustomers,
    newCustomers,
    avgStayDays: Number(avgStayDays.toFixed(2)),
  });
});

export const getMonthlyBookingsData = asyncHandler(async (req, res, next) => {
  const date = req.query.date;
  let dateObj = date ? new Date(date) : new Date();

  if (isNaN(dateObj)) {
    throw new CustomError("Invalid date format", 400);
  }

  const month = dateObj.getMonth() + 1;
  const year = dateObj.getFullYear();

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  const result = await Booking.aggregate([
    {
      $match: {
        createdAt: {
          $gte: startDate,
          $lt: endDate,
        },
      },
    },

    {
      $facet: {
        /* ---------------- STATUS COUNT ---------------- */
        statusStats: [
          {
            $group: {
              _id: null,

              confirmed: {
                $sum: {
                  $cond: [{ $eq: ["$status", "confirmed"] }, 1, 0],
                },
              },

              pending: {
                $sum: {
                  $cond: [{ $eq: ["$status", "pending"] }, 1, 0],
                },
              },

              expired: {
                $sum: {
                  $cond: [{ $eq: ["$status", "expired"] }, 1, 0],
                },
              },
            },
          },
        ],

        /* ---------------- PAYMENT MODE COUNT ---------------- */
        paymentModeStats: [
          {
            $group: {
              _id: null,

              payNow: {
                $sum: {
                  $cond: [{ $eq: ["$paymentMode", "PAY_NOW"] }, 1, 0],
                },
              },

              payOnArrival: {
                $sum: {
                  $cond: [{ $eq: ["$paymentMode", "PAY_ON_ARRIVAL"] }, 1, 0],
                },
              },
            },
          },
        ],
      },
    },
  ]);

  /* ---------------- SAFE EXTRACTION ---------------- */
  const statusStats = result[0]?.statusStats[0] || {};
  const paymentStats = result[0]?.paymentModeStats[0] || {};

  const data = {
    confirmed: statusStats.confirmed || 0,
    pending: statusStats.pending || 0,
    expired: statusStats.expired || 0,

    payNow: paymentStats.payNow || 0,
    payOnArrival: paymentStats.payOnArrival || 0,
  };

  return successResponse(res, 200, `Booking stats for ${month}/${year}`, data);
});