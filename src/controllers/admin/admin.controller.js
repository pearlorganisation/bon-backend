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
      payoutResponse?.status_details?.description || "Payout failed";

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
              totalAdminGST: { $sum: "$bookings.admin_gst" },
              totalAdminAmount: { $sum: "$bookings.adminAmount" },
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
              _id: "$_id", // per payout document
              adminAmount: { $sum: "$bookings.adminAmount" },
              adminGST: { $sum: "$bookings.admin_gst" },
              receivable: { $first: "$adminWallet.receivableAmount" },
              status: { $first: "$adminWallet.status" },
            },
          },

          {
            $project: {
              total: {
                $subtract: [
                  {
                    $add: ["$adminAmount", "$adminGST"],
                  },
                  {
                    $cond: [{ $eq: ["$status", "pending"] }, "$receivable", 0],
                  },
                ],
              },
            },
          },

          {
            $group: {
              _id: null,
              grossProfit: { $sum: "$total" },
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

    totalAdminGST: bookingStats.totalAdminGST || 0,
    // totalAdminAmount: bookingStats.totalAdminAmount || 0,
    totalBookings: bookingStats.totalBookings || 0,

    /* Partner */
    partnerPaidAmount: partnerPayout.totalPaid || 0,
    partnerPendingAmount: partnerPayout.totalPending || 0,

    /* Admin */
    adminGrossProfit: adminProfit.grossProfit || 0,
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
          status: "confirmed",
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

    /* ---------- LIMIT (TOP 5) ---------- */
    {
      $limit: 5,
    },
  ]);

  return successResponse(
    res,
    200,
    `Top performing hotels for ${month}/${year}`,
    result
  );
});


