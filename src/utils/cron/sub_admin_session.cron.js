import cron from "node-cron";
import dayjs from "dayjs";
import { Sub_Admin_Session } from "../../models/Sub_Admin/sub_admin_sessions.model.js";
import Auth from "../../models/auth/auth.model.js";

const sub_admin_cron =()=>{

cron.schedule(
  "59 23 * * *",
  async () => {
    try {
      console.log("🌙 11:59 PM cron started");

      const today = dayjs().format("YYYY-MM-DD");
      const now = new Date();

      /**
       * 1️⃣ Logout all active sessions for TODAY
       */
      await Sub_Admin_Session.updateMany(
        {
          date: today,
          LogoutAt: null,
        },
        {
          $set: {
            LogoutAt: now,
          },
        }
      );

      /**
       * Remove refresh tokens of all sub-admins
       * This FORCES logout on next request
       */
      await Auth.updateMany(
        { role: "SUB_ADMIN", refresh_token: { $ne: null } },
        { $set: { refresh_token: null } }
      );

      console.log(" All sub-admins logged out for today");
    } catch (err) {
      console.error(" 11:59 PM cron failed:", err);
    }
  },
  {
    timezone: "Asia/Kolkata",
  }
);
console.log("✅ sub admin  automatic logout  cron initialized");
};

export default sub_admin_cron;