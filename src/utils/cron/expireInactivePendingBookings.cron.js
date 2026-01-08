import cron from "node-cron";
import Booking from "../../models/Listing/booking.model.js";

 const expireInactivePendingBookingsCron = () => {
  // Runs every 20 minutes
  cron.schedule("*/20 * * * *", async () => {
    try {
      const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000);

      const result = await Booking.updateMany(
        {
          status: "pending",
          updatedAt: { $lte: twentyMinutesAgo },
        },
        {
          status: "expired",
        }
      );

      if (result.modifiedCount > 0) {
        console.log(
          `[CRON] Expired ${result.modifiedCount} inactive pending bookings`
        );
      }
    } catch (error) {
      console.error("[CRON] Error expiring bookings:", error);
    }
  });
  console.log("✅ pending booking  expired cron initialized ");
};

export default expireInactivePendingBookingsCron;