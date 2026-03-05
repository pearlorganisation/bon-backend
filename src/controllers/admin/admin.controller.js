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

export const releasePreviousMonthPayout = asyncHandler(
  async (req, res, next) => {
    const { partnerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(partnerId)) {
      return next(new CustomError("Invalid partnerId", 400));
    }

    /* ---------- GET PREVIOUS MONTH ---------- */
    const now = new Date();
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1);

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
