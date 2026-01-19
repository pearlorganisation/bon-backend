import asyncHandler from "../../middleware/asyncHandler.js";
import CustomError from "../../utils/error/customError.js";
import Partner from "../../models/Partner/partner.model.js";
import Auth from "../../models/auth/auth.model.js";
import successResponse from "../../utils/error/successResponse.js";
import Admin from "../../models/Admin/admin.model.js";
import AdminSubscriptionPlan from "../../models/Admin/admin.subscription.model.js";
import { configDotenv } from "dotenv";

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
                  { $eq: ["$isActive", true] },
                ],
              },
            },
          },
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
