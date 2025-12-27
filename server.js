// server.js
import dotenv from "dotenv";
import app from "./app.js";
import connectDB from "./src/config/db.js";
import expireDocumentAccessCron from "./src/utils/cron/expireDocumentAccess.cron.js";
import sub_admin_cron from "./src/utils/cron/sub_admin_session.cron.js";
dotenv.config();

const PORT = process.env.PORT || 5000;

// Connect DB and start server
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Database connection failed:", err);
    process.exit(1);
  });

if (process.env.ENABLE_CRON === "true") {
  expireDocumentAccessCron();
  sub_admin_cron();
}
