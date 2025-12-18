import SupportCall from "./SupportCall.model.js";
import asyncHandler from "../../../middleware/asyncHandler.js";
import CustomError from "../../../utils/error/customError.js";
import successResponse from "../../../utils/error/successResponse.js"

export const createSupportCall = async (req, res) => {
  try {
    const { phoneNumber, issue } = req.body;

    if (!phoneNumber || !issue) {
      return res.status(400).json({
        success: false,
        message: "Phone number and issue are required",
      });
    }

    const callRequest = await SupportCall.create({
      userId: req.user._id,
      phoneNumber,
      issue,
    });

    res.status(201).json({
      success: true,
      message: "Support call request submitted successfully",
      data: callRequest,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getAllSupportCalls = async (req, res) => {
  try {
    const calls = await SupportCall.find()
      .populate("userId", "name email phoneNumber")
      .populate("handledBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: calls.length,
      data: calls,
    });
  } catch (error) {
    console.error("Get Support Calls Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


export const updateSupportCallStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  // 1️⃣ Validate status
  const validStatuses = [
    "PENDING",
    "IN_PROGRESS",
    "COMPLETED",
    "RESOLVED",
    "FAILED",
  ];

  if (!validStatuses.includes(status)) {
    throw new CustomError("Invalid call status", 400);
  }

  // 2️⃣ Prepare update object
  const updateData = {
    status,
  };

  // 3️⃣ Update calledAt only when COMPLETED
  if (status === "COMPLETED") {
    updateData.calledAt = new Date();
  }

  // 4️⃣ Update DB
  const updatedCall = await SupportCall.findByIdAndUpdate(
    id,
    updateData,
    { new: true }
  );

  if (!updatedCall) {
    throw new CustomError("Support call not found", 404);
  }

  // 5️⃣ Success response
  return successResponse(
    res,
    200,
    "Support call status updated successfully",
    updatedCall
  );
});
