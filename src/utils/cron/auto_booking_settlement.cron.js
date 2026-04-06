import cron from "node-cron";
import Booking from "../../models/Listing/booking.model.js";
import { splitMoney } from "../../controllers/Booking/booking.controller.js";

export const autoBookingSettlementCron = () => {
  // Runs every day at 2 AM
  cron.schedule(
    "0 2 * * *",
    async () => {
      console.log("Running booking auto settlement cron...");

      try {
        const now = new Date();

        const bookings = await Booking.aggregate([
          {
            $match: {
              status: "confirmed",
            },
          },
          {
            $lookup: {
              from: "properties",
              localField: "propertyId",
              foreignField: "_id",
              as: "property",
            },
          },
          { $unwind: "$property" },
          {
            $lookup: {
              from: "partnerplans",
              localField: "priceBreakdown.partnerPlanId",
              foreignField: "_id",
              as: "partnerPlan",
            },
          },
          { $unwind: "$partnerPlan" },
        ]);

        for (const booking of bookings) {
          const checkIn = new Date(booking.checkInDate);

          const deadline = new Date(checkIn.getTime() + 24 * 60 * 60 * 1000);

          if (now > deadline) {
            try {
              // Split money
              const response = await splitMoney(
                booking,
                booking.property.partnerId
              );

              if (response.error) throw response.error;

              await Booking.findByIdAndUpdate(booking._id, {
                status: "auto_settled",
                paymentStatus: "paid",
              });

              console.log(`Booking ${booking._id} auto settled`);
            } catch (error) {
              console.error(`Error processing booking ${booking._id}`, error);
            }
          }
        }

        console.log("Booking auto settlement cron completed");
      } catch (error) {
        console.error("Cron error:", error);
      }
    },
    {
      timezone: "Asia/Kolkata",
    }
  );
   console.log("✅ auto booking settlement cron initialized...");
};
