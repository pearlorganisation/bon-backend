import asyncHandler from "../../middleware/asyncHandler.js";
import CustomError from "../../utils/error/customError.js";
import Property from "../../models/Listing/property.model.js";
import Partner from "../../models/Partner/partner.model.js";
import Auth from "../../models/auth/auth.model.js";
import successResponse from "../../utils/error/successResponse.js";
import { razorpay } from "../../config/razorpayConfig.js";
import axios from "axios";
import { configDotenv } from "dotenv";

configDotenv();

//verify  partner

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
        }
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
        }
      ),
    ]);

    const panData = panResponse.data;
    const gstinData = gstinResponse.data;

    if (!panData || panData?.valid !== true) {
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
  if (req.user.role === "partner") {
    partnerQuery.userId = req.user._id;
  }

  // ADMIN: can see any partner's KYC
  if (req.user.role === "admin") {
    const { partnerUserId } = req.query;

    if (!partnerUserId) {
      return next(new CustomError("partnerUserId is required for admin", 400));
    }

    partnerQuery.userId = partnerUserId;
  }

  const partner = await Partner.findOne(partnerQuery).select(
    "panDetails gstinList isPanVerified"
  );

  if (!partner) {
    return next(new CustomError("Partner not found", 404));
  }

  return res.status(200).json({
    success: true,
    message: "Partner KYC fetched successfully",
    data: {
      panDetails: partner.panDetails || null,
      gstinList: partner.gstinList || [],
      isVerified: partner.isPanVerified,
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
      }
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
      (g) => g.gstin?.toUpperCase() === gstinInfo.GSTIN?.toUpperCase()
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

export const createPartnerFundAccount = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  const { accountHolderName, accountNumber, ifscCode, bankName } = req.body;

  if (!accountHolderName || !accountNumber || !ifscCode) {
    return next(
      new CustomError(
        "accountHolderName, accountNumber and ifscCode are required",
        400
      )
    );
  }

  if (!/^\d{9,18}$/.test(accountNumber)) {
    return next(new CustomError("Invalid bank account number", 400));
  }

  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(ifscCode)) {
    return next(new CustomError("Invalid IFSC code format", 400));
  }

  /* -------------------- 2 Get Partner -------------------- */
  const auth = await Auth.findById(userId);
  const partner = await Partner.findOne({ userId });

  if (!auth || !partner) {
    return next(new CustomError("Partner not found", 404));
  }

  /* -------------------- 3️ PAN Verification Rule -------------------- */
  if (!partner.isPanVerified) {
    return next(
      new CustomError(
        "Complete PAN verification before fund account setup",
        400
      )
    );
  }

  /* -------------------- 4️ Prevent Duplicate -------------------- */
  if (partner?.razorpay?.fundAccountId) {
    return next(new CustomError("Fund account already exists", 409));
  }

  try {
    let contactId = partner?.razorpay?.contactId;

    /* -------------------- 5️ Create Contact (If Needed) -------------------- */
    if (!contactId) {
      let contact;

      try {
        console.log("Razorpay keys:", Object.keys(razorpay));
        contact = await razorpay.contacts.create({
          name: partner.panDetails?.fullName || auth.name,
          email: auth.email,
          contact: auth.phoneNumber || "9999999999",
          type: "vendor",
          reference_id: userId.toString(),
        });
      } catch (err) {
        console.error("Razorpay Contact Error:", err?.error || err);
        return next(
          new CustomError(
            err?.error?.description || "Failed to create Razorpay contact",
            502
          )
        );
      }

      contactId = contact.id;

      partner.razorpay = {
        contactId,
      };

      await partner.save(); // persist contact early
    }

    /* -------------------- 6️ Create Fund Account -------------------- */
    let fundAccount;

    try {
      fundAccount = await razorpay.fundAccount.create({
        contact_id: contactId,
        account_type: "bank_account",
        bank_account: {
          name: accountHolderName,
          ifsc: ifscCode,
          account_number: accountNumber,
        },
      });
    } catch (err) {
      console.error("Razorpay Fund Account Error:", err?.error || err);

      return next(
        new CustomError(
          err?.error?.description || "Failed to create Razorpay fund account",
          502
        )
      );
    }

    /* -------------------- 7️ Save Bank + Fund Details -------------------- */
    partner.razorpay.fundAccountId = fundAccount.id;

    partner.bankDetails = {
      accountHolderName,
      accountNumber,
      ifscCode,
      bankName: bankName || null,
      verifiedAt: new Date(),
    };
    partner.isVerified=true;
    await partner.save();

    /* -------------------- 8️ Success -------------------- */
    return successResponse(
      res,
      201,
      "Razorpay fund account created successfully",
      {
        contactId,
        fundAccountId: fundAccount.id,
      }
    );
  } catch (error) {
    console.error("Fund Account Setup Error:", error);
    return next(
      new CustomError("Unable to setup payout account, try again later", 500)
    );
  }
});

