import express from "express";
const router = express.Router();

import {
  getConversationMessages,
  getConversationList,
  assignPartnerToConversation,
} from "../../controllers/chat/chat.controler.js";

import { protect } from "../../middleware/auth/auth.middleware.js";

/**
 * Customer / Partner
 * Get or create conversation + messages
 */
router.get("/conversation", protect, getConversationMessages);

/**
 * Partner inbox - list of conversations
 */
router.get("/conversation/list", protect, getConversationList);


export default router;
