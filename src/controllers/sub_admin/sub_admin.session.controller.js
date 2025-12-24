import { Sub_Admin_Session } from "../../models/Sub_Admin/sub_admin_sessions.model";
import asyncHandler from  "../../middleware/asyncHandler.js"
import CustomError from "../../utils/error/customError.js"
import successResponse from "../../utils/error/successResponse.js"
import dayjs from   "dayjs"

const HEARTBEAT_SEC = 300;  //5 min
const GRACE_SEC = 180;     //3 min


export const heartbeat = asyncHandler(async (req, res,next) => {
  const userId = req._id;
  const now = new Date();
  const today = dayjs().format("YYYY-MM-DD");

  let session = await Sub_Admin_Session.findOne({ userId, date: today });

  if (!session) {

       return next( new CustomError("user session not found plz login again ",404));
    // session = await Sub_Admin_Session.create({
    //   userId,
    //   role,
    //   date: today,
    //   firstLoginAt: now,
    //   lastPingAt: now,
    //   lastActivityAt: now,
    //   activeDurationSec: HEARTBEAT_SEC,
    // });
    // return res.json({ ok: true });
  }

  const diffSec = (now - session.lastPingAt) / 1000;

  if (diffSec <= HEARTBEAT_SEC) {
    session.activeDurationSec += diffSec;
  }
  else if (diffSec>HEARTBEAT_SEC +GRACE_SEC){
     session.activeDurationSec += HEARTBEAT_SEC;
  }
  else{
    // no time added , it means  user is not in  idle state
  }

  session.lastPingAt = now;
  await session.save();

 return successResponse(res,200,`you todays  total working hr  is ${activeDuration/180}hr`);
});
