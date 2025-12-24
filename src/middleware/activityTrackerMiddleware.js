import asyncHandler from "./asyncHandler.js";
import { Sub_Admin_Session } from "../models/Sub_Admin/sub_admin_sessions.model.js";
import dayjs from "dayjs";

const IGNORE_ACTIVITY_ROUTES = ["/health", "/heartbeat", "/ping"];


export const activityTrackerMiddleware = asyncHandler(
  async (req, res, next) => {
    try {
      const userId = req._id;
      if (!userId) return next();

      const path = req.originalUrl.split("?")[0];

      // Ignore system routes
      if (IGNORE_ACTIVITY_ROUTES.includes(path)) {
        return next();
      }

      const today = dayjs().format("YYYY-MM-DD");
      const now = new Date();
      let session = await Sub_Admin_Session.findOne({
        userId,
        date: today,
      });

      if (!session) {
        return next(
          new CustomError("your session expired , plz login again ", 401)
        );
      }
      session.lastActivity = {
        path,
        method: req.method,
        at: now,
      };

      await session.save();

      next();
    } catch (err) {
      console.error("Activity tracker error:", err);
      next();
    }
  }
);
