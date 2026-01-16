import express from "express";
const router = express.Router();
import {
  getOrCreateConversation,
  getConversationMessages,
  getPartnerConversationList,
  deleteMessageAttachment,
  updateMessage,
  getCustomerConversationList,
  sendMessageWithFiles
} from "../../controllers/chat/chat.controler.js";
import CustomError from "../../utils/error/customError.js";
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
  upload.array("files", 4),sendMessageWithFiles
);

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
router.delete("/delete/msg", protect, deleteMessageAttachment);

router.patch("/udpate/message", protect, updateMessage);
router.patch("/udpate/message", protect, updateMessage);

export default router;
