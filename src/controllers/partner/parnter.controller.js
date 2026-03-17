import asyncHandler from "../../middleware/asyncHandler.js";
import CustomError from "../../utils/error/customError.js";
import Property from "../../models/Listing/property.model.js";
import Partner from "../../models/Partner/partner.model.js";
import PartnerPlan from "../../models/Partner/PartnerPlan.model.js";
import Auth from "../../models/auth/auth.model.js";
import successResponse from "../../utils/error/successResponse.js";
import { razorpay } from "../../config/razorpayConfig.js";
import axios from "axios";
import { configDotenv } from "dotenv";
import Admin from "../../models/Admin/admin.model.js";
import AdminSubscriptionPlan from "../../models/Admin/admin.subscription.model.js";
import { normalizeDate,getDatesBetween } from "../Booking/booking.controller.js";
import RoomModel from "../../models/Listing/room.model.js";
import RoomInventoryModel from "../../models/Listing/roomInventory.model.js";
import Booking from "../../models/Listing/booking.model.js";
import ManualRoomBlock from "../../models/Listing/manualRoomBlock.model.js";
import mongoose from "mongoose";

configDotenv();

//verify  partner
//
export const partner_KYC = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  const { panNumber } = req.body;

  if (!panNumber) {
    return next(new CustomError("PAN number is required", 400));
  }

  const partner = await Partner.findOne({ userId });
  if (!partner) {
    return next(new CustomError("Partner not found", 404));
  }

  try {
    // -------- PARALLEL API CALLS --------
    const timestamp = Date.now();
    const verification_id = `${panNumber}_${timestamp}`;

    const [panResponse, gstinResponse] = await Promise.all([
      axios.post(
        process.env.PAN_VERIFY_API_URL,
        { pan: panNumber },
        {
          headers: {
            "Content-Type": "application/json",
            "x-client-id": process.env.CASHFREE_CLIENT_ID,
            "x-client-secret": process.env.CASHFREE_CLIENT_SECRET,
          },
        },
      ),
      axios.post(
        process.env.GSTIN_PAN_API_URL,
        { pan: panNumber, verification_id },
        {
          headers: {
            "Content-Type": "application/json",
            "x-client-id": process.env.CASHFREE_CLIENT_ID,
            "x-client-secret": process.env.CASHFREE_CLIENT_SECRET,
          },
        },
      ),
    ]);

    const panData = panResponse.data;
    const gstinData = gstinResponse.data;

    if (!panData || panData?.valid !== true) {
      partner.isPanVerified = false;
      partner.panDetails = undefined;
      partner.gstinList = [];
      await partner.save();
      return next(new CustomError("PAN verification failed", 400));
    }

    const gstinList = Array.isArray(gstinData?.gstin_list)
      ? gstinData.gstin_list.map((g) => ({
          gstin: g.gstin,
          state: g.state,
          status: g.status,
        }))
      : [];

    // -------- UPDATE THE DOCUMENT --------
    partner.panDetails = {
      panNumber: panData.pan,
      fullName: panData.registered_name,
      panType: panData.type,
      panStatus: "VALID",
      verifiedAt: new Date(),
    };

    partner.gstinList = gstinList;
    partner.isPanVerified = true;

    // Save the document
    await partner.save();

    return res.status(200).json({
      success: true,
      message: "Partner KYC verified successfully",
      data: {
        panDetails: partner.panDetails,
        gstinList: partner.gstinList,
      },
    });
  } catch (error) {
    console.error("KYC Error:", error?.response?.data || error);

    let message = error?.response?.data
      ? error?.response?.data?.message
      : "Internal server error";

    return res.status(500).json({
      success: false,
      message,
      error: error?.response?.data || error.message,
    });
  }
});

// GET partner KYC details
export const getPartnerKYC = asyncHandler(async (req, res, next) => {
  let partnerQuery = {};

  // PARTNER: can see only own KYC
  if (req.user.role === "PARTNER") {
    // Note: Changed to uppercase to match your authorizeRoles middleware
    partnerQuery.userId = req.user._id;
  }

  // ADMIN: can see any partner's KYC
  if (req.user.role === "ADMIN") {
    const { partnerUserId } = req.query;

    if (!partnerUserId) {
      return next(new CustomError("partnerUserId is required for admin", 400));
    }

    partnerQuery.userId = partnerUserId;
  }

  const partner = await Partner.findOne(partnerQuery).select(
    "panDetails gstinList isPanVerified",
  );

  if (!partner) {
    return next(new CustomError("Partner not found", 404));
  }

  // Logic Fix: Only return data if isPanVerified is true
  const isVerified = partner.isPanVerified === true;

  return res.status(200).json({
    success: true,
    message: "Partner KYC fetched successfully",
    data: {
      // If not verified, return null/empty to prevent showing unverified data
      panDetails: isVerified ? partner.panDetails || null : null,
      gstinList: isVerified ? partner.gstinList || [] : [],
      isVerified: isVerified,
    },
  });
});

export const verify_property_GSTIN = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  const { gstin, propertyId } = req.body;

  if (!gstin || !propertyId) {
    return next(new CustomError("gstin and propertyId required", 400));
  }

  // 1️⃣ Find property
  const property = await Property.findOne({
    _id: propertyId,
    partnerId: userId,
  });

  if (!property) {
    return next(new CustomError("Property not found", 404));
  }

  // 2️⃣ Find partner
  const partner = await Partner.findOne({ userId });

  if (!partner) {
    return next(new CustomError("Partner account not found", 404));
  }

  if (!partner.isPanVerified) {
    return next(new CustomError("First verify your PAN account", 400));
  }
  console.log(propertyId, gstin);
  try {
    // 3️⃣ Verify GSTIN
    const response = await axios.post(
      process.env.GSTIN_VERIFY_API_URL,
      { GSTIN: gstin },
      {
        headers: {
          "Content-Type": "application/json",
          "x-client-id": process.env.CASHFREE_CLIENT_ID,
          "x-client-secret": process.env.CASHFREE_CLIENT_SECRET,
        },
      },
    );

    const gstinInfo = response.data;

    console.log(gstinInfo, "awea");
    if (!gstinInfo || !gstinInfo?.valid) {
      return res.status(400).json({
        success: false,
        message: "GSTIN verification failed",
        data: gstinInfo || null,
      });
    }

    // 4️⃣ Check if GSTIN is linked to PAN
    const isLinkedWithPAN = partner?.gstinList?.some(
      (g) => g.gstin?.toUpperCase() === gstinInfo.GSTIN?.toUpperCase(),
    );

    const message = isLinkedWithPAN
      ? `GSTIN is linked with partner PAN (${partner?.panDetails?.panType})`
      : `GSTIN is NOT linked with partner PAN (${partner?.panDetails?.panType})`;

    // 5️⃣ Update property GSTIN verification
    await Property.findByIdAndUpdate(propertyId, {
      "documentVerification.GSTIN": {
        gstin: gstinInfo.GSTIN,
        legalName: gstinInfo.legal_name_of_business,
        tradeName: gstinInfo.trade_name_of_business,
        constitutionOfBusiness: gstinInfo.constitution_of_business,
        taxpayerType: gstinInfo.taxpayer_type,
        gstStatus: gstinInfo.gst_in_status,
        dateOfRegistration: gstinInfo.date_of_registration,
        natureOfBusinessActivities:
          gstinInfo.nature_of_business_activities || [],
        status: "verified",
        GSTIN_message: message,
      },
    });

    return res.status(200).json({
      success: true,
      message: "GSTIN verified successfully",
      linkedWithPAN: isLinkedWithPAN,
      gstinDetails: gstinInfo,
    });
  } catch (error) {
    console.log("GSTIN Verification Error", error?.response?.data || error);

    let message = error?.response?.data
      ? error?.response?.data?.message
      : "Internal server error";

    return res.status(500).json({
      success: false,
      message,
      error: error?.response?.data || error.message,
    });
  }
});

// RAZORPAY KYC FLOW START
//
export const createPartnerFundAccount = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user._id;
    const { accountHolderName, accountNumber, ifscCode, bankName } = req.body;

    const auth = await Auth.findById(userId).session(session);
    const partner = await Partner.findOne({ userId }).session(session);

    if (!auth || !partner) {
      throw new CustomError("Partner not found", 404);
    }

    if (partner?.razorpay?.fundAccountId) {
      throw new CustomError("Fund account already exists", 409);
    }

    let contactId = partner?.razorpay?.contactId;

    /* ---- External API Call (no session control) ---- */
    if (!contactId) {
      const contact = await razorpay.contacts.create({
        name: partner.panDetails?.fullName || auth.name,
        email: auth.email,
        contact: auth.phoneNumber || "9999999999",
        type: "vendor",
        reference_id: userId.toString(),
      });

      contactId = contact.id;
    }

    const fundAccount = await razorpay.fundAccount.create({
      contact_id: contactId,
      account_type: "bank_account",
      bank_account: {
        name: accountHolderName,
        ifsc: ifscCode,
        account_number: accountNumber,
      },
    });

    /* ---- DB Update inside transaction ---- */

    partner.razorpay = {
      contactId,
      fundAccountId: fundAccount.id,
    };

    partner.bankDetails = {
      accountHolderName,
      accountNumber, // ideally encrypt
      ifscCode,
      bankName: bankName || null,
      verifiedAt: new Date(),
    };

    await partner.save({ session });

    await session.commitTransaction();
    session.endSession();

    return successResponse(res, 201, "Fund account created", {
      contactId,
      fundAccountId: fundAccount.id,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    return next(
      new CustomError(
        error?.error?.description || error.message || "Fund setup failed",
        error.status || 500,
      ),
    );
  }
});

export const updatePartnerBankAccount = asyncHandler(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user._id;
    const { accountHolderName, accountNumber, ifscCode, bankName } = req.body;

    if (!accountHolderName || !accountNumber || !ifscCode) {
      throw new CustomError(
        "accountHolderName, accountNumber and ifscCode are required",
        400,
      );
    }

    if (!/^\d{9,18}$/.test(accountNumber)) {
      throw new CustomError("Invalid bank account number", 400);
    }

    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(ifscCode)) {
      throw new CustomError("Invalid IFSC code format", 400);
    }

    const partner = await Partner.findOne({ userId }).session(session);

    if (!partner) {
      throw new CustomError("Partner not found", 404);
    }

    if (!partner?.razorpay?.contactId) {
      throw new CustomError(
        "Payout contact not found. Setup payout first.",
        400,
      );
    }

    /* ---------- CREATE NEW FUND ACCOUNT IN RAZORPAY ---------- */

    const newFundAccount = await razorpay.fundAccounts.create({
      contact_id: partner.razorpay.contactId,
      account_type: "bank_account",
      bank_account: {
        name: accountHolderName,
        ifsc: ifscCode,
        account_number: accountNumber,
      },
    });

    /* ---------- SAVE NEW FUND ACCOUNT ---------- */

    partner.razorpay.fundAccountId = newFundAccount.id;

    partner.bankDetails = {
      accountHolderName,
      accountNumber, // ideally encrypt
      ifscCode,
      bankName: bankName || null,
      updatedAt: new Date(),
    };

    await partner.save({ session });

    await session.commitTransaction();
    session.endSession();

    return successResponse(res, 200, "Bank account updated successfully", {
      newFundAccountId: newFundAccount.id,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    return next(
      new CustomError(
        error?.error?.description || error.message || "Bank update failed",
        error.status || 500,
      ),
    );
  }
});
//  PARTNER PLAN

export const buyNewCommissionPlan = asyncHandler(async (req, res, next) => {
  const { commissionPercentage } = req.body;
  const partnerId = req.user._id;

  if (!commissionPercentage) {
    return next(new CustomError("commission percentage is required", 400));
  }

  const isValid = await Partner.findOne({
    userId: partnerId,
    isVerified: true,
  });

  if (!isValid) {
    return next(new CustomError("before creating plan complete your kyc", 400));
  }

  // check upcoming plan
  const upcomingPlan = await PartnerPlan.findOne({
    partnerId,
    planStatus: "UPCOMING",
  });

  if (upcomingPlan) {
    return next(new CustomError("you already have an upcoming plan", 400));
  }

  // get admin commission range
  const admin = await Admin.findOne();
  if (!admin) {
    return next(new CustomError("platform commission not configured", 500));
  }

  const { min, max } = admin.commission;

  if (commissionPercentage < min || commissionPercentage > max) {
    return next(
      new CustomError("commission percentage is outside platform range", 400),
    );
  }

  // check active plan
  const activePlan = await PartnerPlan.findOne({
    partnerId,
    planStatus: "ACTIVE",
  });

  const startDate = activePlan ? activePlan.endDate : new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 30);

  const plan = await PartnerPlan.create({
    partnerId,
    PlanType: "COMMISSION",
    commissionPercentage,
    planStatus: activePlan ? "UPCOMING" : "ACTIVE",
    startDate,
    endDate,
  });

  successResponse(res, 201, "commission plan created", plan);
});

export const buyNewSubscriptionPlan = asyncHandler(async (req, res, next) => {
  const partnerId = req.user._id;
  const { subscriptionPlanId } = req.params;

  const isValid = await Partner.findOne({
    userId: partnerId,
    isVerified: true,
  });

  if (!isValid) {
    return next(new CustomError("before creating plan complete your kyc", 400));
  }

  // 1. block multiple upcoming plans
  const upcomingPlan = await PartnerPlan.findOne({
    partnerId,
    planStatus: "UPCOMING",
  });

  if (upcomingPlan) {
    return next(new CustomError("you already have an upcoming plan", 400));
  }

  // 2. validate subscription plan
  const plan = await AdminSubscriptionPlan.findById(subscriptionPlanId);
  if (!plan) {
    return next(new CustomError("subscription plan not found", 404));
  }

  if (!plan.isActive) {
    return next(new CustomError("subscription plan is not active", 400));
  }

  // 3. get active plan (if any)
  const activePlan = await PartnerPlan.findOne({
    partnerId,
    planStatus: "ACTIVE",
  });

  const startDate = activePlan ? activePlan.endDate : new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + plan.durationDays);

  // 4. reuse or create INACTIVE (payment pending) plan
  let inactivePlan = await PartnerPlan.findOne({
    partnerId,
    planStatus: "INACTIVE",
  });

  if (!inactivePlan) {
    inactivePlan = new PartnerPlan({
      partnerId,
      PlanType: "SUBSCRIPTION",
      planStatus: "INACTIVE",
    });
  }

  inactivePlan.subscriptionPlanId = subscriptionPlanId;
  inactivePlan.startDate = startDate;
  inactivePlan.endDate = endDate;

  inactivePlan.subscriptionPayment = inactivePlan.subscriptionPayment || {};

  // 5. create razorpay order
  try {
    const order = await razorpay.orders.create({
      amount: Math.round(plan.price * 100),
      currency: "INR",
      receipt: inactivePlan._id.toString(),

      notes: {
        purpose: "SUBSCRIPTION",
        partnerPlanId: inactivePlan._id.toString(),
      },
    });

    inactivePlan.subscriptionPayment.orderId = order.id;
    await inactivePlan.save();

    successResponse(res, 201, "order created", {
      orderId: order.id,
      amount: plan.price,
      currency: "INR",
    });
  } catch (err) {
    return next(
      new CustomError(
        err?.error?.description || "payment gateway error",
        err.statusCode || 502,
      ),
    );
  }
});

export const subscriptionWebhookController = asyncHandler(
  async (req, res, next) => {
    const { eventType, orderId, paymentId } = req.razorpay;

    if (eventType !== "payment.captured" && eventType !== "payment.failed") {
      return res.status(200).json({ success: true });
    }

    const plan = await PartnerPlan.findOne({
      "subscriptionPayment.orderId": orderId,
    });

    if (!plan) {
      return res.status(200).json({ success: true });
    }

    if (eventType === "payment.failed") {
      return res.status(200).json({ success: true });
    }

    // payment.captured
    if (plan.planStatus !== "INACTIVE") {
      return res.status(200).json({ success: true });
    }

    const activePlan = await PartnerPlan.findOne({
      partnerId: plan.partnerId,
      planStatus: "ACTIVE",
    });

    plan.subscriptionPayment.paymentId = paymentId;
    plan.planStatus = activePlan ? "UPCOMING" : "ACTIVE";

    await plan.save();

    return res.status(200).json({ success: true });
  },
);

export const getMyPlans = asyncHandler(async (req, res, next) => {
  const partnerId = req.user._id;

  const plans = await PartnerPlan.find({
    partnerId,
    planStatus: { $in: ["ACTIVE", "UPCOMING"] },
  }).sort({ createdAt: 1 });

  successResponse(res, 200, "successfully fetched current plans", { plans });
});


//PARTNER
//manully blocked room

export const blockRoom = asyncHandler(async (req,res,next)=>{
      
   const partnerId = req.user._id;

      let { propertyId, roomId, startDate, endDate, rooms, reason, notes } = req.body;

      if(!propertyId  || !roomId){
        throw new CustomError("propertyId and roomId are required",400);
      }
      if (!startDate || !endDate)
        throw new CustomError("start date and end dates dates are required", 400);
      
       startDate =normalizeDate(startDate);
       endDate =normalizeDate(endDate);

      if (isNaN(startDate) || isNaN(endDate))
        throw new CustomError("Invalid date format", 400);

      if (endDate < startDate)
        throw new CustomError(
          "endDate date must be after startDate",
          400
        );
        const reasonFeilds =["OFFLINE_BOOKING", "MAINTENANCE", "OWNER_BLOCK", "OTHER"];
        if ( !reason  || !reasonFeilds.includes(reason)){
              throw new CustomError(`reason is required and should be  ${reasonFeilds}`);
        }

          if (!rooms || rooms <= 0)
            throw new CustomError(
              " number of rooms are required and must be greater than 0 ",
              400
            );


        const session = await mongoose.startSession();
        session.startTransaction();

        try {
          const room = await RoomModel.findById(roomId).session(session);

          if (!room) throw new CustomError("Room not found", 404);

          const dates = getDatesBetween(startDate, endDate);

          const inventories = await RoomInventoryModel.find({
            roomId,
            date: { $in: dates },
          }).session(session);

          const inventoryMap = new Map();

          inventories.forEach((inv) => {
            inventoryMap.set(new Date(inv.date).toISOString(), inv);
          });

          // Validate availability
          for (const date of dates) {
            const key = normalizeDate(date).toISOString();
            const inv = inventoryMap.get(key);

            const booked = inv?.bookedRooms || 0;
            const total = inv?.totalRooms || room.numberOfRooms;

            if (booked + rooms > total) {
              throw new CustomError(
                `Not enough rooms to block on ${key.slice(0, 10)}`,
                400
              );
            }
          }

          // Update inventory
          for (const date of dates) {
            await RoomInventoryModel.findOneAndUpdate(
              { roomId, date },
              {
                $setOnInsert: {
                  propertyId,
                  roomId,
                  date,
                  totalRooms: room.numberOfRooms,
                },
                $inc: { bookedRooms: rooms },
              },
              { upsert: true, session }
            );
          }

          const block = await ManualRoomBlock.create(
            [
              {
                propertyId,
                roomId,
                partnerId,
                startDate,
                endDate,
                rooms,
                reason,
                notes,
              },
            ],
            { session }
          );

          await session.commitTransaction();
          session.endSession();

          successResponse(res, 201, "Rooms blocked successfully", block[0]);
        } catch (err) {
          await session.abortTransaction();
          session.endSession();
          throw err;
        }

});

export const releaseBlock = asyncHandler(async (req, res) => {

  const { id } = req.params;
  const partnerId =req.user._id;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {

    const block = await ManualRoomBlock.findOne({_id:id,partnerId}).session(session);

    if (!block) throw new CustomError("manually block  room data  not found", 404);
    if (block.released) throw new CustomError("Block already released", 400);
     
    const dates = getDatesBetween(block.startDate, block.endDate);

    for (const date of dates) {

     const inv = await RoomInventoryModel.findOne({
       roomId: block.roomId,
       date,
     }).session(session);

     if (!inv || inv.bookedRooms < block.rooms) {
       throw new CustomError("Inventory mismatch while releasing block", 400);
     }

     await RoomInventoryModel.findOneAndUpdate(
       { roomId: block.roomId, date },
       { $inc: { bookedRooms: -block.rooms } },
       { session }
     );

    }

    block.released = true;
    block.releasedAt = new Date();
    block.releasedBy = partnerId;

    await block.save({ session });

    await session.commitTransaction();
    session.endSession();

    successResponse(res, 200, "Block released successfully", block);

  } catch (err) {

    await session.abortTransaction();
    session.endSession();
    throw err;

  }

});

export const getPartnerRoomCalendar = asyncHandler(async (req, res) => {
  const { propertyId, startDate, endDate } = req.query;
   const partnerId =req.user._id;

  if (!propertyId) throw new CustomError("propertyId is required", 400);

  const property= await Property.findOne({_id:propertyId ,partnerId});

  if(!property)throw new CustomError("property not found", 400);

  if (!startDate || !endDate)
    throw new CustomError("startDate and endDate are required", 400);

  const start = normalizeDate(startDate);
  const end = normalizeDate(endDate);

  if (isNaN(start) || isNaN(end))
    throw new CustomError("Invalid date format", 400);

  if (end < start)
    throw new CustomError("endDate must be after startDate", 400);

  const dates = getDatesBetween(start, end);

  const rooms = await RoomModel.find({ propertyId });

  const roomIds = rooms.map((r) => r._id);

  const inventories = await RoomInventoryModel.find({
    roomId: { $in: roomIds },
    date: { $in: dates },
  });

  const bookings = await Booking.find({
    "rooms.roomId": { $in: roomIds },
    checkInDate: { $lte: end },
    checkOutDate: { $gte: start },
  });

  const manualBlocks = await ManualRoomBlock.find({
    partnerId,
    roomId: { $in: roomIds },
    released: false,
    startDate: { $lte: end },
    endDate: { $gte: start },
  });

  const inventoryMap = new Map();

  inventories.forEach((inv) => {
    const key = `${inv.roomId}_${normalizeDate(inv.date).toISOString()}`;
    inventoryMap.set(key, inv);
  });

  const result = [];

  for (const room of rooms) {
    const roomDates = [];

    for (const date of dates) {
      const normalized = normalizeDate(date);
      const key = `${room._id}_${normalized.toISOString()}`;

      const inv = inventoryMap.get(key);

      const bookedRooms = inv?.bookedRooms || 0;
      const totalRooms = inv?.totalRooms || room.numberOfRooms;

      const dateBookings = [];

      bookings.forEach((b) => {
        const roomItem = b.rooms.find(
          (r) => r.roomId.toString() === room._id.toString()
        );

        if (!roomItem) return;

        if (
          normalized >= normalizeDate(b.checkInDate) &&
          normalized <= normalizeDate(b.checkOutDate)
        ) {
          dateBookings.push({
            bookingId: b._id,
            checkInDate: b.checkInDate,
            checkOutDate: b.checkOutDate,
            rooms: roomItem.quantity,
            status: b.status,
          });
        }
      });

      const dateBlocks = [];

      manualBlocks.forEach((block) => {
        if (block.roomId.toString() !== room._id.toString()) return;

        if (
          normalized >= normalizeDate(block.startDate) &&
          normalized <= normalizeDate(block.endDate)
        ) {
          dateBlocks.push({
            blockId: block._id,
            startDate: block.startDate,
            endDate: block.endDate,
            rooms: block.rooms,
            reason: block.reason,
          });
        }
      });

      roomDates.push({
        date: normalized,
        bookedRooms,
        availableRooms: totalRooms - bookedRooms,
        bookings: dateBookings,
        manualBlocks: dateBlocks,
      });
    }

    result.push({
      roomId: room._id,
      roomName: room.name,
      totalRooms: room.numberOfRooms,
      dates: roomDates,
    });
  }

  successResponse(res, 200, "Room calendar fetched", result);
});