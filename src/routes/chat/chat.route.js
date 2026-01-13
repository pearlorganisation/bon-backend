import express from "express";
const router = express.Router();
import {
  getOrCreateConversation,
  getConversationMessages,
  getPartnerConversationList,
  getCustomerConversationList,
} from "../../controllers/chat/chat.controler.js";

import { protect } from "../../middleware/auth/auth.middleware.js";

import {
  uploadFileToCloudinary,
  deleteFileFromCloudinary,
} from "../../utils/cloudinary.js";
import multer from "multer";
// ✅ Multer memory storage
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    files: 4,
    fileSize: 5 * 1024 * 1024, // ⬅️ 5 MB per file (recommended)
  },
});

router.post(
  "/update-file",
  protect,
  upload.array("files", 4),
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      if (req.files.length > 4) {
        return res.status(400).json({ message: "Maximum 4 files allowed" });
      }

      // ✅ Upload to Cloudinary (already supports array)
      const uploadedFiles = await uploadFileToCloudinary(
        req.files,
        "chat_files"
      );

      res.json({
        success: true,
        files: uploadedFiles.map((file) => ({
          url: file.secure_url,
          public_id: file.public_id,
          type: file.resource_type,
          format: file.format,
        })),
      });
    } catch (error) {
      console.error("Update file error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

router.delete("/delete-file", protect, async (req, res) => {
  try {
    const { messageId, publicId, resource_type } = req.body;

    if (!messageId || !publicId) {
      return res.status(400).json({
        message: "messageId and publicId are required",
      });
    }

    const message = await MessageModel.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    //  Authorization (only sender can delete)
    if (message.senderId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not allowed" });
    }

    // Delete from Cloudinary
    await deleteFileFromCloudinary(
      publicId,
      resource_type === "image" ? "image" : "raw"
    );

    // 4️⃣ Remove attachment from DB
    message.attachments = message.attachments.filter(
      (a) => a.public_id !== publicId
    );

    //  If message becomes empty → delete message
    if (!message.text && message.attachments.length === 0) {
      await Message.findByIdAndDelete(messageId);

      return res.json({
        success: true,
        message: "Attachment deleted and message removed",
      });
    }

    //  Otherwise save updated message
    await message.save();

    res.json({
      success: true,
      message: "Attachment deleted successfully",
      attachments: message.attachments,
    });
  } catch (error) {
    console.error("Delete file error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * 1️ Create or get conversationId (Customer)
 */
router.post("/conversation", protect, getOrCreateConversation);

/**
 * 2️ Get messages (Customer / Partner)
 * conversationId REQUIRED
 */
router.get("/messages", protect, getConversationMessages);

router.get("/conversations", protect, getCustomerConversationList);

/**
 * 3️ Partner inbox - list of conversations
 */
router.get("/partner/conversations", protect, getPartnerConversationList);

export default router;
