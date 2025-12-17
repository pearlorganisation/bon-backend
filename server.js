// server.js
import dotenv from "dotenv";
import app from "./app.js";
import connectDB from "./src/config/db.js";
import  expireDocumentAccessCron from "./src/utils/cron/expireDocumentAccess.cron.js"
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

  expireDocumentAccessCron();