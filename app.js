import express from "express";
import http from "http";
import corsConfig from "./src/config/corsConfig.js";
import morgan from "morgan";
import MainRouter from "./src/routes/index.js";
import notFound from "./src/middleware/notFound.js";
import errorHandler from "./src/middleware/errorHandler.js";
import cookieParser from "cookie-parser";
import initSocket from "./src/socket/index.js";
import { razorpayRefundWebhook } from "./src/controllers/Booking/booking.controller.js";
import { razorpayPayoutWebhook } from "./src/controllers/admin/admin.controller.js";
import {
  verifyRazorpaySignature,
  razorpayWebhookRouter,
} from "./src/middleware/razorpay.middleware.js";

const app = express();

/* Razorpay webhook */
app.post(
  "/api/v1/webhook/razorpay-payment",
  express.raw({ type: "application/json" }),
  verifyRazorpaySignature,
  razorpayWebhookRouter
);
app.post(
  "/api/v1/webhook/razorpay-refund",
  express.raw({ type: "application/json" }),
  razorpayRefundWebhook
);
app.post(
  "api/v1/webhook/razorpay-payout",
  express.raw({type:"application/json"}),
  razorpayPayoutWebhook
)

/* Middlewares */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(corsConfig);
app.use(cookieParser());
app.use(morgan("dev"));

/* Routes */
app.use("/api/v1", MainRouter);

app.get("/", (req, res) => {
  res.status(200).send("APIs are working...");
});

/* Error handling */
app.use(notFound);
app.use(errorHandler);

const server = http.createServer(app);

initSocket(server);

export { app, server };
