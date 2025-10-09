
import successResponse from "../../utils/error/successResponse.js"; 
import CustomError from "../../utils/error/customError.js";
import asyncHandler from "../../middleware/asyncHandler.js"

import { EOTP } from "../../models/otp/otp.model.js";
import Auth from "../../models/auth/auth.model.js";

import { sendOtpEmail } from "../../utils/mail/mailer.js";



export const register = asyncHandler(async (req, res) => {
          
          
})




