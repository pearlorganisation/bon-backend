import cors from "cors";

// ✅ Function to check if the app is running in development
const isDev = () => process.env.NODE_ENV === "development";

// ✅ Function to get allowed origins based on environment
const getAllowedOrigins = () => {
  if (isDev()) {
    return [
      "http://localhost:3000",
      "http://localhost:5173",
    ];
  } else {
    return [
      "http://localhost:5173",
    ];
  }
};

const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = getAllowedOrigins();

    // allow requests with no origin (like curl, Postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  credentials: true, // required for cookies
};

export default cors(corsOptions);
