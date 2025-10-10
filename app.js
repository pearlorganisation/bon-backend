import express from "express";
import corsConfig from "./src/config/corsConfig.js";
import morgan from "morgan";
import MainRouter from "./src/routes/index.js";
import notFound from "./src/middleware/notFound.js";
import errorHandler from "./src/middleware/errorHandler.js";
import cookieParser from "cookie-parser";
const app = express();

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
