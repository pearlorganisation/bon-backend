import express from "express";
const route = express.Router();
import { heartbeat ,getSubAdminSessionHistory,getTodaySubAdminSession} from "../../controllers/sub_admin/sub_admin.session.controller.js";

import { protect,authorizeRoles } from "../../middleware/auth/auth.middleware.js";

route.use(protect);
route.use(authorizeRoles("ADMIN"))


route.get("/get-subAdmin-sessions-history/:id",getSubAdminSessionHistory);
route.get("/get-today-subadmins-session",getTodaySubAdminSession);

export default route;
