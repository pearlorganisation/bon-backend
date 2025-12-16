import SupportTicket from "./supportTicket.model.js";
import asyncHandler from "../../../middleware/asyncHandler.js";
import successResponse from "../../../utils/error/successResponse.js";

// ✅ Create support ticket (Customer)
export const createSupportTicket = asyncHandler(async (req, res) => {
  const { issueType, subject, description } = req.body;

  if (!issueType || !subject || !description) {
    return res.status(400).json({
      success: false,
      message: "All fields are required",
    });
  }

  const ticket = await SupportTicket.create({
    userId: req.user._id,
    issueType,
    subject,
    description,
  });

  return successResponse(
    res,
    201,
    "Support ticket created successfully",
    ticket
  );
});

// ✅ Get all support tickets (Admin)
export const getAllSupportTickets = asyncHandler(async (req, res) => {
  const tickets = await SupportTicket.find()
    .populate("userId", "name email phoneNumber") // Customer info
    .populate("handledBy", "name email") // Admin info
    .sort({ createdAt: -1 });

  return successResponse(
    res,
    200,
    "Support tickets fetched successfully",
    tickets
  );
});

// ✅ Update support ticket status (Admin)
export const updateSupportTicketStatus = asyncHandler(async (req, res) => {
  const { ticketId } = req.params;
  const { status } = req.body;

  const validStatuses = [
    "PENDING",
    "IN_PROGRESS",
    "COMPLETED",
    "RESOLVED",
    "FAILED",
  ];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Invalid status. Allowed values: ${validStatuses.join(", ")}`,
    });
  }

  const ticket = await SupportTicket.findById(ticketId);
  if (!ticket) {
    return res.status(404).json({
      success: false,
      message: "Support ticket not found",
    });
  }

  ticket.status = status;

  ticket.resolvedAt = status === "COMPLETED" ? new Date() : null;

  await ticket.save();

  const updatedTicket = await SupportTicket.findById(ticketId)
    .populate("userId", "name email phoneNumber")
    .populate("handledBy", "name email");

  return successResponse(
    res,
    200,
    "Support ticket status updated successfully",
    updatedTicket
  );
});
