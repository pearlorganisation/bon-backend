import express from "express";
const route = express.Router();
import { heartbeat } from "../../controllers/sub_admin/sub_admin.session.controller.js";
import { activityTrackerMiddleware } from "../../middleware/activityTrackerMiddleware.js";
import { protect } from "../../middleware/auth/auth.middleware.js";

route.use(protect);

route.get("/heartbeat", heartbeat);

export default route;
