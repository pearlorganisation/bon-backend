import SupportCall from "../models/Customer/SupportCall.model.js"

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
  