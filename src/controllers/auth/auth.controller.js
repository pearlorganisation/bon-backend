import successResponse from "../../utils/error/successResponse.js";
import CustomError from "../../utils/error/customError.js";
import asyncHandler from "../../middleware/asyncHandler.js";

import { OTP } from "../../models/otp/otp.model.js";
import Auth from "../../models/auth/auth.model.js";
import { generateOTP } from "../../utils/otpUtils.js";
import { sendOtpEmail } from "../../utils/mail/mailer.js";
import jwt from "jsonwebtoken";


export const register = asyncHandler(async (req, res, next) => {
  const { email, name, phoneNumber, password,role} = req?.body;

  const Roles = ["CUSTOMER", "PARTNER"];
  
  if (!email || !name || !phoneNumber || !password || !role || !Roles.includes(role)){
    return next(
      new CustomError(
        "All fields (name, email, phoneNumber, password, role ) are required",
        400
      )
    );
  }


  const existingUser = await Auth.findOne({ email});
  const otp = generateOTP();
  console.log("generated otp", otp);
  try {
    if (existingUser) {
      if (existingUser.isVerified) {
        return next(new CustomError("User already exists!", 400));
      }

      // 5️⃣ Send OTP via email
      await sendOtpEmail(name, email, otp, "REGISTER");

      await OTP.findOneAndReplace(
        { email, type: "REGISTER"},
        { otp, email, type: "REGISTER" },
        { upsert: true, new: true } // upsert: Creates a new document if no match is found., new: returns updated doc
      );

      return res.status(200).json({
        success: true,
        message: "OTP resent successfully. Please verify your email.",
      });
    }

    // Create new user and send OTP
    // 5️⃣ Send OTP via email
  
    await OTP.create({
      otp,
      email,
      type: "REGISTER",
    });
    await Auth.create({ ...req?.body, isVerified: false }); // this will through error if user creation fails

    await sendOtpEmail(name, email, otp, "REGISTER");
    
    return successResponse(
      res,
      201,
      "OTP sent successfully. Please verify your email."
    );
  } catch (error) {
    console.error("Error Sending OTP:", error);
    return next(new CustomError(`Failed to send OTP: ${error.message}`, 400));
  }
});

/**
 * @desc Login user
 */

export const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // 1️⃣ Validate input
  if (!email || !password ){
    throw new CustomError("Email  password and  role are required", 400);
  }

  // 2️⃣ Check if user exists
  const user = await Auth.findOne({ email});
  if (!user) {
    throw new CustomError("User not found", 404);
  }

  // 3️⃣ Ensure user is verified
  if (!user.isVerified) {
    throw new CustomError("Please verify your email before logging in", 403);
  }

  // 4️⃣ Check password 
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new CustomError("Invalid credentials", 401);
  }

  // 5️⃣ Generate tokens
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  // Save refresh token in DB

  user.refresh_token = refreshToken;
  await user.save({ validateBeforeSave: false });

  setAuthCookies(res, accessToken, refreshToken);

  // 6️⃣ Return response

  return successResponse(res, 200, "Login successful", {
    accessToken,
    refreshToken,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

// ✅ Verify Email OTP
export const verifyOtp = asyncHandler(async (req, res, next) => {
  const { email, otp, type} = req.body;
  
  ;
  // 1️⃣ Basic validation
  if (!email || !otp || !type ) {
    return next(new CustomError("Email OTP type and roles are required", 400));
  }

  // 2️⃣ Check if OTP exists and matches
  const otpRecord = await OTP.findOne({ email,type });

  if (!otpRecord) {
    return next(new CustomError("OTP expired or not found", 400));
  }

  if (otpRecord.otp !== otp ) {
    return next(new CustomError("Invalid OTP", 400));
  }

  // 3️⃣ Find user and verify
  const user = await Auth.findOne({ email });
  if (!user) {
    return next(new CustomError("User not found", 404));
  }
  
  if (otpRecord.type === "FORGOT_PASSWORD") {

    await OTP.deleteOne({ email, type: "FORGOT_PASSWORD"});
      
     
    
    return successResponse(
      res,
      200,
      "OTP verified successfully. You can now reset your password."
    );
  }

  if (user.isVerified) {
    return next(new CustomError("User already verified", 400));
  }

  user.isVerified = true;

  // 4️⃣ Generate tokens
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  // 5️⃣ Save refresh token in DB
  user.refresh_token = refreshToken;
  await user.save();

  // 6️⃣ Delete OTP (used)
  await OTP.deleteOne({ email, type: "REGISTER"});

  // 7️⃣ Set tokens in cookies
  setAuthCookies(res, accessToken, refreshToken);

  // 8️⃣ Send success response
  return successResponse(res, 200, "Email verified successfully!", {
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

export const resendOtp = asyncHandler(async (req, res,next) => {
  const { email, type} = req.body;
  
  
  if (!email || !type) {
    return next(new CustomError("Email OTP and role are required", 400));
  }

  const user = await Auth.findOne({ email});


  if (!user) return next(new CustomError("User not found", 404));

  const otp = generateOTP();
  console.log("regenerated otp", otp);

    await OTP.findOneAndReplace(
      { email, type},
      { email, otp, type},
      { upsert: true, new: true }
    );
  
  await sendOtpEmail(user.name, email, otp, type);

  return successResponse(res, 200, "OTP resent successfully");
});

export const logout = asyncHandler(async (req, res, next) => {
  const userId = req.user?._id; // assuming you have auth middleware that sets req.user

  if (userId) {
    // Remove refresh token from DB
    await Auth.findByIdAndUpdate(userId, { refresh_token: null });
  }

  // Clear cookies
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");

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

    // Generate new access token only
    const newAccessToken = user.generateAccessToken();

    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 1 * 24 * 60 * 60 * 1000, // 1 day
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
 
  
  if (!email) return next(new CustomError("Email and role is required", 400));

  const user =await Auth.findOne({ email});
  if (!user) return next(new CustomError("User not found", 404));

  if (!user.isVerified) return next(new CustomError("User not verified", 403));

  const otp = generateOTP();

  // Save OTP in DB (type: FORGOT_PASSWORD)
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
   
  

  if (!email || !newPassword ) return next(new CustomError("email role and password are not provided", 400));
    
  const user = await Auth.findOne({ email });

  if (!user) return next(new CustomError("user not found", 400));
      
  user.password = newPassword;
  await user.save();

  return successResponse(res, 200, "password reset Successfully");
});

const setAuthCookies = (res, accessToken, refreshToken) => {
  const base = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  };

  res.cookie("accessToken", accessToken, {
    ...base,
    maxAge: 1 * 24 * 60 * 60 * 1000, // 1 day
  });

  res.cookie("refreshToken", refreshToken, {
    ...base,
    maxAge: 15 * 24 * 60 * 60 * 1000, // 15 days
  });
};
