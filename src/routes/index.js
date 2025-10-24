
import express from "express"

import AuthRouter from "./auth/auth.route.js";
import UserRouter from "./user.route.js";
import PartnerRouter from "./partner/partner.route.js";

const router = express.Router();



router.use("/auth", AuthRouter);
router.use("/partner", PartnerRouter);
router.use("/", UserRouter);

export default router;