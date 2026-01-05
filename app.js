import express from "express";
import corsConfig from "./src/config/corsConfig.js";
import morgan from "morgan";
import MainRouter from "./src/routes/index.js";
import notFound from "./src/middleware/notFound.js";
import errorHandler from "./src/middleware/errorHandler.js";
import cookieParser from "cookie-parser";
import { razorpayWebhook } from "./src/controllers/Booking/booking.controller.js";


const app = express();


app.post(
  "/api/v1/webhook/razorpay",
  express.raw({ type: "application/json" }),
  razorpayWebhook
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(corsConfig);
app.use(cookieParser());
app.use(morgan("dev"));

app.use("/api/v1", MainRouter);
app.get("/", (req, res) => {
  res.status(200).send("APIs are working...");
});

app.use(notFound);
app.use(errorHandler);

export default app;
