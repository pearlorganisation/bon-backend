import successResponse from "../../utils/error/successResponse.js";
import CustomError from "../../utils/error/customError.js";
import { sendSubAdminCreatedEmail } from "../../utils/mail/mailer.js";
import asyncHandler from "../../middleware/asyncHandler.js";
import { OTP } from "../../models/otp/otp.model.js";
import Auth from "../../models/auth/auth.model.js";
import Customer from "../../models/Customer/customer.model.js";
import Partner from "../../models/Partner/partner.model.js";
import Sub_Admin from "../../models/Sub_Admin/sub_admin.model.js";
import { generateOTP } from "../../utils/otpUtils.js";
import { sendOtpEmail } from "../../utils/mail/mailer.js";
import jwt from "jsonwebtoken";
import dayjs from "dayjs";
import { Sub_Admin_Session } from "../../models/Sub_Admin/sub_admin_sessions.model.js";
import { deleteFileFromCloudinary } from "../../utils/cloudinary.js";
export const register = asyncHandler(async (req, res, next) => {         
  const { email, name, phoneNumber, password, role } = req?.body;

  const Roles = ["CUSTOMER", "PARTNER"];

  if (
    !email ||
    !name ||
    !phoneNumber ||
    !password ||
    !role ||
    !Roles.includes(role)
  ) {
    return next(
      new CustomError(
        "All fields (name, email, phoneNumber, password, role) are required",
        400
      )
    );
  }

  const existingUser = await Auth.findOne({ email });
  const otp = generateOTP();
  console.log("generated otp", otp);

  // 2. Handle Existing User
  if (existingUser) {
    // If user is already verified, block registration
    if (existingUser.isVerified) {
      return next(new CustomError("User already exists!", 400));
    }

    // If user exists but NOT verified, resend OTP
    try {
      await OTP.findOneAndReplace(
        { email, type: "REGISTER" },
        { otp, email, type: "REGISTER" },
        { upsert: true, new: true }
      );
      await sendOtpEmail(name, email, otp, "REGISTER");
      return res.status(200).json({
        success: true,
        message: "Account pending verification. OTP resent successfully.",
      });
    } catch (error) {
      console.error("Error resending OTP:", error);
      return next(
        new CustomError(`Failed to send email: ${error.message}`, 500)
      );
    }
  }

  // 3. Handle New User Registration with ROLLBACK
  let newUser = null;
  try {
    // A. Create OTP Record first
    await OTP.findOneAndReplace(
      { email, type: "REGISTER" },
      { otp, email, type: "REGISTER" },
      { upsert: true, new: true }
    );

    // B. Create User (Force isVerified: false)
    newUser = await Auth.create({
      ...req.body,
      isVerified: false,
    });

    // if (role === "CUSTOMER") {
    //   await Customer.create({
    //     userId: newUser._id,
    //   });
    // } else {
    //   await Partner.create({
    //     userId: newUser._id,
    //   });
    // }

    // C. Send OTP via email
  sendOtpEmail(name, email, otp, "REGISTER").catch((err) =>
    console.error("Email failed:", err)
  );

    return successResponse(
      res,
      201,
      "User registered successfully. Please verify your email.",
      {
        email: newUser.email,
        message:
          "OTP sent to your email. Please verify to complete registration.",
      }
    );
  } catch (error) {
    console.error("Error during registration:", error);

    return next(new CustomError(`Registration failed: ${error.message}`, 400));
  }
});

export const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  console.log("login user ", email, password);

  if (!email || !password) {
    throw new CustomError("Email and password are required", 400);
  }

  const user = await Auth.findOne({ email });
  if (!user) {
    throw new CustomError("User not found", 404);
  }

  if (!user.isVerified) {
    throw new CustomError("Please verify your email before logging in", 403);
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new CustomError("Invalid credentials", 401);
  }

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  console.log("refresh token ", refreshToken);

  user.refresh_token = refreshToken;
  await user.save({ validateBeforeSave: false });

  setAuthCookies(res, accessToken, refreshToken);

  if (user.role == "SUB_ADMIN") {
    //for sub admin create sessions .

    const now = new Date();
    const today = dayjs().format("YYYY-MM-DD");

    let session = await Sub_Admin_Session.findOne({
      userId: user._id,
      date: today,
    });

    // Create session only if not exists
    if (!session) {
      session = await Sub_Admin_Session.create({
        userId: user._id,
        date: today,
        LoginAt: now,
        lastPingAt: now,
        role: "SUB_ADMIN",
        activeDurationSec: 0,
        lastActivity: {
          path: "/login",
          method: "post",
          at: now,
        },
        LogoutAt: null,
      });
    } else {
      // Re-login same day → resume session
      session.LogoutAt = null;
      session.lastPingAt = now;
      await session.save();
    }
  }

  return successResponse(res, 200, "Login successful", {
    accessToken,
    refreshToken,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
    },
  });
});

export const verifyOtp = asyncHandler(async (req, res, next) => {
  const { email, otp, type } = req.body;

  if (!email || !otp || !type) {
    return next(new CustomError("Email, OTP and type are required", 400));
  }

  const otpRecord = await OTP.findOne({ email, type });

  if (!otpRecord) {
    return next(new CustomError("OTP expired or not found", 400));
  }

  if (otpRecord.otp !== otp) {
    return next(new CustomError("Invalid OTP", 400));
  }

  const user = await Auth.findOne({ email });

  if (!user) {
    return next(new CustomError("User not found", 404));
  }

  if (otpRecord.type === "FORGOT_PASSWORD") {
    await OTP.deleteOne({ email, type: "FORGOT_PASSWORD" });
    return successResponse(
      res,
      200,
      "OTP verified successfully. You can now reset your password."
    );
  }

  if (user.isVerified) {
    // If somehow verified but OTP existed, just clean up
    await OTP.deleteOne({ email, type: "REGISTER" });
    return next(new CustomError("User already verified", 400));
  }
 console.log(user);
  if (user.role === "CUSTOMER") {
    await Customer.create({
      userId: user._id,
    });
  } else {
    await Partner.create({
      userId: user._id,
    });
  }

  user.isVerified = true;
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();
  user.refresh_token = refreshToken;
  await user.save();
  await OTP.deleteOne({ email, type: "REGISTER" });

  setAuthCookies(res, accessToken, refreshToken);

  return successResponse(res, 200, "Email verified successfully!", {
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
    },
    accessToken,
    refreshToken,
  });
});

export const resendOtp = asyncHandler(async (req, res, next) => {
  const { email, type } = req.body;

  if (!email || !type) {
    return next(new CustomError("Email and type are required", 400));
  }

  const user = await Auth.findOne({ email });
  if (!user) return next(new CustomError("User not found", 404));

  const otp = generateOTP();
  console.log("regenerated otp", otp);

  await OTP.findOneAndReplace(
    { email, type },
    { email, otp, type },
    { upsert: true, new: true }
  );

  await sendOtpEmail(user.name, email, otp, type);

  return successResponse(res, 200, "OTP resent successfully");
});

export const logout = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;

  if (userId) {
    // Combine these into one call for better performance
    await Auth.findByIdAndUpdate(userId, { refresh_token: null });
    await Auth.findByIdAndUpdate(userId, { fcmToken: null });
  }
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");

  if (req.user.role == "SUB_ADMIN") {
    const now = new Date();
    const today = dayjs().format("YYYY-MM-DD");

    let session = await Sub_Admin_Session.findOne({ userId, date: today });

    if (session) {
      session.LogoutAt = now;
      await session.save(); // Added await here as save() is asynchronous
    }
  }

  return successResponse(res, 200, "Logged out successfully");
});

export const refreshToken = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.refreshToken;
  if (!token) return next(new CustomError("Refresh token missing", 401));

  try {
    const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);

    const user = await Auth.findById(decoded._id);
    if (!user || user.refresh_token !== token) {
      return next(new CustomError("Refresh token invalid", 401));
    }

    const newAccessToken = user.generateAccessToken();

    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      path: "/",
      maxAge: 1 * 24 * 60 * 60 * 1000,
    });

    return successResponse(res, 200, "Tokens refreshed successfully", {
      accessToken: newAccessToken,
    });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return next(
        new CustomError("Refresh token expired, please login again", 401)
      );
    }
    return next(new CustomError("Invalid refresh token", 401));
  }
});

export const forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  if (!email) return next(new CustomError("Email is required", 400));

  const user = await Auth.findOne({ email });
  if (!user) return next(new CustomError("User not found", 404));

  if (!user.isVerified) return next(new CustomError("User not verified", 403));

  const otp = generateOTP();

  await OTP.findOneAndReplace(
    { email, type: "FORGOT_PASSWORD" },
    { email, otp, type: "FORGOT_PASSWORD" },
    { upsert: true, new: true }
  );

  await sendOtpEmail(user.name, email, otp, "FORGOT_PASSWORD");

  return successResponse(res, 200, "OTP sent to email for password reset");
});

export const resetPassword = asyncHandler(async (req, res, next) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword)
    return next(new CustomError("Email and new password are required", 400));

  const user = await Auth.findOne({ email });
  if (!user) return next(new CustomError("User not found", 400));

  user.password = newPassword;
  await user.save();

  return successResponse(res, 200, "Password reset Successfully");
});

//create sub admin

export const create_sub_admin = asyncHandler(async (req, res, next) => {
  let { name, email, password } = req.body;

  if (!email || !password) {
    return next(new CustomError("Email & password are required", 400));
  }

  const existingUser = await Auth.findOne({ email });
  if (existingUser) {
    return next(new CustomError("User with this email already exists", 400));
  }

  // Auto-generate name if not provided
  if (!name) {
    name = `SubAdmin-${Date.now()}`;
  }

  const newSubAdmin = await Auth.create({
    name,
    email,
    password,
    role: "SUB_ADMIN",
    isVerified: true,
  });

  if (newSubAdmin) {
    await Sub_Admin.create({
      userId: newSubAdmin._id,
    });

    // 📧 Send email to sub-admin
    sendSubAdminCreatedEmail(name, email, password)
      .then(() => {
        console.log("Sub-admin email sent");
      })
      .catch((err) => {
        console.error("Failed to send sub-admin email:", err.message);
      });
  }

  return successResponse(
    res,
    201,
    "Sub-admin created successfully",
    newSubAdmin
  );
});

export const delete_user = asyncHandler(async (req, res, next) => {
  const id = req.params.id;

  const user = await Auth.findById(id);

  if (!user) {
    return next(new CustomError("user not found", 404));
  }

  if (user.role == "SUB_ADMIN") {
    await Sub_Admin.findOneAndDelete({ userId: id });
  } else if (user.role == "PARTNER") {
    await Partner.findOneAndDelete({ userId: id });
  } else if (user.role == "CUSTOMER") {
    await Customer.findOneAndDelete({ userId: id });
  } else {
  }
  if (user?.profileImageUrl?.public_id) {
    await deleteFileFromCloudinary(user?.profileImageUrl?.public_id, "image");
  }

  let deletedUser = await Auth.findByIdAndDelete(id);
  return successResponse(res, 200, "user deleted successfully", deletedUser);
});

const setAuthCookies = (res, accessToken, refreshToken) => {
  const base = {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
  };
  res.cookie("accessToken", accessToken, {
    ...base,
    maxAge: 1 * 24 * 60 * 60 * 1000,
  });
  res.cookie("refreshToken", refreshToken, {
    ...base,
    maxAge: 15 * 24 * 60 * 60 * 1000,
  });
};

export const saveFcmToken = async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user._id;

    if (!token) {
      return res.status(400).json({ message: "FCM token required" });
    }

    // Save or update single FCM token for the user
    await Auth.findByIdAndUpdate(
      userId,
      {
        fcmToken: token, // overwrite old token
      },
      { new: true }
    );

    res.json({ success: true, message: "FCM token saved successfully" });
  } catch (error) {
    console.error("Save FCM token error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
