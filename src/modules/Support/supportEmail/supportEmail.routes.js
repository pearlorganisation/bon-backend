import express from "express";
import { protect } from "../../../middleware/auth/auth.middleware.js";
import {
  sendSupportEmail,
  getAllEmails,
  updateEmailStatus,
} from "./supportEmail.controller.js";

import router from "../../../routes/booking.routes.js";

const routes = express.Router();

routes.post("/email-support", protect, sendSupportEmail);
routes.get("/support-emails", protect, getAllEmails);
routes.patch("/support-email-status/:id",protect,updateEmailStatus);

export default routes;
