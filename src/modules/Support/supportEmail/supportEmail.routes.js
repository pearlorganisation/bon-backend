import express from "express";
import { protect } from "../../../middleware/auth/auth.middleware.js";
import { sendSupportEmail } from "./supportEmail.controller.js";

import router from "../../../routes/booking.routes.js";

const routes = express.Router();

routes.post("/email-support", protect, sendSupportEmail);

export default routes;
