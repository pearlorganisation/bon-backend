import express from "express";
const router = express.Router();

import {
  getOrCreateConversation,
  getConversationMessages,
  getPartnerConversationList,
} from "../../controllers/chat/chat.controler.js"

import { protect } from "../../middleware/auth/auth.middleware.js";

/**
 * 1️ Create or get conversationId (Customer)
 */
router.post("/conversation", protect, getOrCreateConversation);

/**
 * 2️ Get messages (Customer / Partner)
 * conversationId REQUIRED
 */
router.get("/messages", protect, getConversationMessages);

/**
 * 3️ Partner inbox - list of conversations
 */
router.get(
  "/partner/conversations",
  protect,
  getPartnerConversationList
);

export default router;
