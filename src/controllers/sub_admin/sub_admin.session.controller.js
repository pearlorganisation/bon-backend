import { Sub_Admin_Session } from "../../models/Sub_Admin/sub_admin_sessions.model.js";
import asyncHandler from "../../middleware/asyncHandler.js";
import CustomError from "../../utils/error/customError.js";
import successResponse from "../../utils/error/successResponse.js";
import dayjs from "dayjs";

const HEARTBEAT_SEC = 300; // 5 min
const GRACE_SEC = 180;     // 3 min

export const heartbeat = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;
  const now = new Date();
  const today = dayjs().format("YYYY-MM-DD");

  let session = await Sub_Admin_Session.findOne({ userId, date: today });

  if (!session) {
    return next(
      new CustomError("User session not found, please login again", 401)
    );
  }

  const diffSec = (now - session.lastPingAt) / 1000;

  if (diffSec <= HEARTBEAT_SEC) {
    session.activeDurationSec += diffSec;
  } 
  else if (diffSec <= HEARTBEAT_SEC + GRACE_SEC) {
    session.activeDurationSec += HEARTBEAT_SEC;
  }
  // else → no time added (inactive)

  session.lastPingAt = now;
  await session.save();

  const activeHours = (session.activeDurationSec / 3600).toFixed(2);

  return successResponse(
    res,
    200,
    `Today's active time: ${activeHours} hours`,
    {
      activeDurationSec: session.activeDurationSec,
      activeHours,
    }
  );
});



export const getAllPartnerActiveTime = asyncHandler(
  async (req, res, next) => {
    const today = dayjs().format("YYYY-MM-DD");

    const sessions = await Sub_Admin_Session.find(
      {
        role: "SUB_ADMIN",
        date: today,
      },
    ).lean();

    const data = sessions.map((s) => ({
      userId: s.userId,
      activeDurationSec: s.activeDurationSec,
      activeHours: +(s.activeDurationSec / 3600).toFixed(2),
      LoginAt: s.LoginAt,
      LogoutAt: s.LogoutAt,
      lastPingAt: s.lastPingAt,
      lastActivity:s.lastActivity
    }));

    return successResponse(
      res,
      200,
      "Today's active time for each partner fetched successfully",
      {
        date: today,
        totalPartners: data.length,
        data,
      }
    );
  }
);


export const getPartnerActiveHistoryByUserId = asyncHandler(
  async (req, res, next) => {
    const { userId } = req.params;
    const now = Date.now();

    const sessions = await Sub_Admin_Session.find(
      {
        userId,
        role: "SUB_ADMIN",
      },
      {
        date: 1,
        LoginAt: 1,
        LogoutAt: 1,
        lastPingAt: 1,
        activeDurationSec: 1,
        _id: 0,
      }
    )
      .sort({ date: -1 }) // latest first
      .lean();

    if (!sessions.length) {
      return next(new CustomError("No session history found", 404));
    }

    const data = sessions.map((s) => {
      const lastPingDiffSec =
        (now - new Date(s.lastPingAt)) / 1000;

      const isOnline = !s.LogoutAt && lastPingDiffSec <= HEARTBEAT_SEC;

      let sessionState = "OFFLINE";
      if (isOnline) sessionState = "ONLINE";
      else if (!s.LogoutAt) sessionState = "IDLE";

      return {
        date: s.date,

        sessionState,
        isOnline,

        activeDurationSec: s.activeDurationSec,
        activeHours: +(s.activeDurationSec / 3600).toFixed(2),

        LoginAt: s.LoginAt,
        LogoutAt: s.LogoutAt,
        lastPingAt: s.lastPingAt,
      };
    });

    return successResponse(
      res,
      200,
      "Partner active history fetched successfully",
      {
        userId,
        totalDays: data.length,
        history: data,
      }
    );
  }
);




export const getMyTodayStatus = asyncHandler(async (req, res, next) => {
  const userId = req.user._id; // assuming auth middleware sets req.user
  const today = dayjs().format("YYYY-MM-DD");
  const now = Date.now();

  const session = await Sub_Admin_Session.findOne({
    userId,
    role: "SUB_ADMIN",
    date: today,
  }).lean();

  if (!session) {
    return next(new CustomError("No session found for today", 404));
  }

  const lastPingDiffSec = (now - new Date(session.lastPingAt)) / 1000;
  const isOnline = lastPingDiffSec <= HEARTBEAT_SEC;

  let sessionState = "OFFLINE";
  if (isOnline) sessionState = "ONLINE";
  else if (!session.LogoutAt) sessionState = "IDLE";

  const activeHours = +(session.activeDurationSec / 3600).toFixed(2);

  return successResponse(res, 200, "Today's status fetched successfully", {
    userId: session.userId,
    date: today,
    sessionState,
    isOnline,
    activeDurationSec: session.activeDurationSec,
    activeHours,
    LoginAt: session.LoginAt,
    LogoutAt: session.LogoutAt,
    lastPingAt: session.lastPingAt,
  });
});
