import express from "express";

import AuthRouter from "./auth/auth.route.js";
import UserRouter from "./user.route.js";
import PartnerRouter from "./partner/partner.route.js";
import BookingRouter from "./booking.routes.js";
import DocRouter from "./document.routes.js";
import ReviewsRouter from "./review.routes.js";
import RoomsRouter from "./room.route.js";

const router = express.Router();

router.use("/auth", AuthRouter);
router.use("/doc", DocRouter);
router.use("/partner", PartnerRouter);
router.use("/booking", BookingRouter);
router.use("/reviews", ReviewsRouter);
router.use("/rooms", RoomsRouter);
router.use("/", UserRouter);

export default router;
