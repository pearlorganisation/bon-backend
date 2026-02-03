import mongoose from "mongoose";

const Sub_Admin_Session_Schema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auth",
      required: true,
      index: true,
    },

    role: {
      type: String, //SUB_ADMIN
      required: true, //only subAdmin
    },

    date: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true,
    },
    LoginAt: {
      type: Date,
      required: true,
    },
    LogoutAt: {
      type: Date,
      default: null,
    },

    lastPingAt: {
      type: Date,
      required: true, //heartbeat
    },
    lastActivity: {
      path: {
        type: String, // "/contacts"
      },
      method: {
        type: String, // GET / POST
      },
      at: {
        type: Date,
      },
    },

    activeDurationSec: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

Sub_Admin_Session_Schema.index({ userId: 1, date: 1 }, { unique: true });

export const Sub_Admin_Session = mongoose.model(
  "Sub_Admin_Session",
  Sub_Admin_Session_Schema
);
