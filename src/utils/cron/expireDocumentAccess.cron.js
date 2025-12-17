import cron from "node-cron";
import {PartnerDocumentAccess} from "../../modules/Document_Request/documentRequest.model.js";

/**
 * Runs every 1 hour
 * Checks approved document access and expires them
 */
const expireDocumentAccessCron = () => {
  cron.schedule("0 * * * *", async () => {
    try {
      const now = new Date();

      const result = await PartnerDocumentAccess.updateMany(
        {
          status: "approved",
          accessEndDate: { $lte: now },
        },
        {
          $set: {
            status: "expired",
          },
        }
      );

      if (result.modifiedCount > 0) {
        console.log(
          `[CRON] Expired ${result.modifiedCount} document access records`
        );
      }
    } catch (error) {
      console.error("[CRON ERROR] Expire document access:", error);
    }
  });

  console.log("✅ Document access expiry cron initialized");
};

export default expireDocumentAccessCron;
