import express from "express";
const router = express.Router();
import {
  getOrCreateConversation,
  getConversationMessages,
  getPartnerConversationList,
  deleteMessageAttachment,
  updateMessage,
  getCustomerConversationList,
  getOrCreateAdminConversation,
  getAdminConversationList,
  sendMessage,
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

      // Upload to Cloudinary (already supports array)
      const uploadedFiles = await uploadFileToCloudinary(
        req.files,
        "chat_files",
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
  },
);

/**
 * Admin/Sub-Admin Conversation Routes
 */
router.post("/admin/conversation", protect, getOrCreateAdminConversation);
router.get("/admin/conversations", protect, getAdminConversationList);
router.post("/message", protect, sendMessage);

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

router.delete("/delete/msg", protect, deleteMessageAttachment);

router.patch("/udpate/message", protect, updateMessage);

export default router;
