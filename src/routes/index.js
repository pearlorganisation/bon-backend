import express from "express";

import AuthRouter from "./auth/auth.route.js";
import UserRouter from "./user.route.js";
import PartnerRouter from "./partner/partner.route.js";
import BookingRouter from "./booking.routes.js";
import DocRouter from "../modules/Document_Request/documentRequest.routes.js";
import ReviewsRouter from "./review.routes.js";
import RoomsRouter from "./room.route.js";
import SuportCallRouter from "../modules/Support/supportCall/supportCall.routes.js";
import SupportEmail from "../modules/Support/supportEmail/supportEmail.routes.js";
import SupportTicket from "../modules/Support/supportTicket/support.routes.js"
import subAdminRoute from "./subAdmin/subAdmin.route.js"
import adminRoute from  "./admin/admin.routes.js"
const router = express.Router();

router.use("/auth", AuthRouter);
router.use("/doc", DocRouter);
router.use("/partner", PartnerRouter);
router.use("/booking", BookingRouter);
router.use("/reviews", ReviewsRouter);
router.use("/rooms", RoomsRouter);
router.use("/supportEmail",SupportEmail);
router.use("/supportCall", SuportCallRouter);
router.use("/supportTickets",SupportTicket);
router.use("/subAdmin",subAdminRoute);
router.use("/admin",adminRoute);
router.use("/", UserRouter);

export default router;
