import cron from "node-cron";
import PartnerPlan from "../../models/Partner/PartnerPlan.model.js"

 const startPartnerPlanCron = () => {
    
  cron.schedule("5 0 * * *", async () => {
    try {
      const now = new Date();

      /* ---------------- EXPIRE ACTIVE PLANS ---------------- */

      const expiredPlans = await PartnerPlan.find({
        planStatus: "ACTIVE",
        endDate: { $lte: now },
      });

      for (const plan of expiredPlans) {
        plan.planStatus = "EXPIRED";
        await plan.save();

        /* -------- ACTIVATE UPCOMING PLAN (IF EXISTS) -------- */

        const upcomingPlan = await PartnerPlan.findOne({
          partnerId: plan.partnerId,
          planStatus: "UPCOMING",
        }).sort({ createdAt: 1 });

        if (!upcomingPlan) continue;

        upcomingPlan.planStatus = "ACTIVE";

        await upcomingPlan.save();
      }
    } catch (err) {
      console.error("Partner plan cron failed:", err);
    }
  });
  console.log("✅ partner plan expired  cron initialized");
};

export default startPartnerPlanCron;