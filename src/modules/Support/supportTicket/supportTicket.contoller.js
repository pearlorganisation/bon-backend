import SupportTicket from "./supportTicket.model.js";

// ✅ Create support ticket (Customer)
export const createSupportTicket = async (req, res) => {
  try {
    const { issueType, subject, description } = req.body;

    console.log(
      "issueType, subject, description ",
      issueType,
      subject,
      description
    );

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

    res.status(201).json({
      success: true,
      message: "Support ticket created successfully",
      data: ticket,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ✅ Get all tickets for admin
export const getAllSupportTickets = async (req, res) => {
  try {
    const tickets = await SupportTicket.find()
      .populate("userId", "name email phoneNumber") // 👈 CUSTOMER CONTACT
      .populate("handledBy", "name email") // 👈 ADMIN
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: tickets,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
