import cron from "node-cron";
import mongoose from "mongoose";
import Booking from "../../models/Listing/booking.model.js";
import RoomInventory from "../../models/Listing/roomInventory.model.js";
import {
  getDatesBetween,
  normalizeDate,
} from "../../controllers/Booking/booking.controller.js";

const expireInactivePendingBookingsCron = () => {
  // Runs every 20 minutes
  cron.schedule(
    "*/20 * * * *",
    async () => {
      console.log("[CRON] Running pending booking expiry job...");

      const session = await mongoose.startSession();

      try {
        const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000);

        const bookings = await Booking.find({
          status: "pending",
          updatedAt: { $lte: twentyMinutesAgo },
        });

        if (!bookings.length) {
          return;
        }

        for (const booking of bookings) {
          session.startTransaction();

          try {
            // 1️ Release inventory
            const dates = getDatesBetween(
              normalizeDate(booking.checkInDate),
              normalizeDate(booking.checkOutDate)
            );

            for (const room of booking.rooms) {
              for (const date of dates) {
                await RoomInventory.findOneAndUpdate(
                  {
                    roomId: room.roomId,
                    date,
                    bookedRooms: { $gte: room.quantity },
                  },
                  {
                    $inc: { bookedRooms: -room.quantity },
                  },
                  { session }
                );
              }
            }

            // 2️ Expire booking
            booking.status = "expired";
            await booking.save({ session });

            await session.commitTransaction();
          } catch (err) {
            await session.abortTransaction();
            console.error(
              `[CRON] Failed to expire booking ${booking._id}:`,
              err
            );
          }
        }

        console.log(`[CRON] Expired ${bookings.length} pending bookings`);
      } catch (error) {
        console.error("[CRON] Error running expiry job:", error);
      } finally {
        session.endSession();
      }
    },
    {
      timezone: "Asia/Kolkata",
    }
  );

  console.log("✅ Pending booking expiry cron initialized");
};

export default expireInactivePendingBookingsCron;
