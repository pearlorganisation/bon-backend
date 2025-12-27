import { Sub_Admin_Session } from "../../models/Sub_Admin/sub_admin_sessions.model.js";
import asyncHandler from "../../middleware/asyncHandler.js";
import CustomError from "../../utils/error/customError.js";
import successResponse from "../../utils/error/successResponse.js";
import dayjs from "dayjs";
import Auth from "../../models/auth/auth.model.js";

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



export const getTodaySubAdminSession = asyncHandler(async (req, res) => {
  const today = dayjs().format("YYYY-MM-DD");

  // 1️⃣ Get ALL sub-admins
  const subAdmins = await Auth.find({ role: "SUB_ADMIN" })
    .select("_id name email")
    .lean();

  // 2️⃣ Get TODAY sessions
  const sessions = await Sub_Admin_Session.find({ date: today }).lean();

  // 3️⃣ Create map for quick lookup
  const sessionMap = new Map();
  sessions.forEach((s) => {
    sessionMap.set(String(s.userId), s);
  });

  // 4️⃣ Build final response
  const data = subAdmins.map((user) => {
    const session = sessionMap.get(String(user._id));
     

    if (!session) {
      // ❌ Not logged in today
      return {
        userId: user._id,
        name: user.name,
        email: user.email,
        loggedIn: false,
        loginAt: null,
        logoutAt: null,
        activeHours: 0,
        lastActivity: null,
        lastPingAt: null,
        sessionState: "OFFLINE"
      };
    }

    // ✅ Logged in today
    const now  =Date.now();
    const lastPingDiffSec = (now - new Date(session.lastPingAt)) / 1000;

    const isOnline = !session.LogoutAt && lastPingDiffSec <= HEARTBEAT_SEC+ GRACE_SEC;

    let sessionState = "OFFLINE";
    if (isOnline) sessionState = "ONLINE";
    return {
      userId: user._id,
      name: user.name,
      email: user.email,
      loggedIn: true,
      loginAt: session.LoginAt,
      logoutAt: session.LogoutAt,
      activeHours: +(session.activeDurationSec / 3600).toFixed(2),
      lastActivity: session.lastActivity,
      lastPingAt: session.lastPingAt,
      sessionState,
    };
  });

  // 5️⃣ Summary
  const summary = {
    date: today,
    totalSubAdmins: subAdmins.length,
    loggedInCount: data.filter((d) => d.loggedIn).length,
    notLoggedInCount: data.filter((d) => !d.loggedIn).length,
  };

  return successResponse(res, 200, "Today's sub-admin activity report", {
    summary,
    data,
  });
});


export const getSubAdminSessionHistory = asyncHandler(async (req, res) => {
  const { id: subAdminId } = req.params;

  // 1️ Validate sub-admin
  const subAdmin = await Auth.findOne({
    _id: subAdminId,
    role: "SUB_ADMIN",
  })
    .select("_id name email")
    .lean();

  if (!subAdmin) {
    throw new CustomError("Sub-admin not found", 404);
  }

  // 2️ Fetch ALL sessions (history)
  const sessions = await Sub_Admin_Session.find({
    userId: subAdminId,
  })
    .sort({ date: -1 }) // latest first
    .lean();

  // 3️ Format response
  const data = sessions.map((s) => ({
    date: s.date,
    loginAt: s.LoginAt,
    logoutAt: s.LogoutAt,
    activeHours: +(s.activeDurationSec / 3600).toFixed(2),
    lastActivity: s.lastActivity,
    lastPingAt: s.lastPingAt,
  }));

  return res.status(200).json({
    status: true,
    message: "Sub-admin session history fetched successfully",
    data: {
      subAdmin,
      totalDays: data.length,
      sessions: data,
    },
  });
});




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
    return next(new CustomError("No session found for today", 401));
  }

  const activeHours = +(session.activeDurationSec / 3600).toFixed(2);

  return successResponse(res, 200, "Today's status fetched successfully", {
    userId: session.userId,
    date: today,
    activeDurationSec: session.activeDurationSec,
    activeHours,
    LoginAt: session.LoginAt,
    LogoutAt: session.LogoutAt,
    lastPingAt: session.lastPingAt,
  });
});
