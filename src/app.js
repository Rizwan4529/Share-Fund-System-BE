import express from "express";
import cors from "cors";
import { HTTP_STATUS } from "#/utils/constants";
import { errorMiddleware } from "#/middleware/errorMiddleware";
const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
      ];

      //Always allow request with no origin (like Postman, curl, etc)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        console.error(`Blocked by CORS policy: ${origin}`);
        return callback(null, false);
      }
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

app.get("/health", (req, res) => {
  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: "Server is healthy",
  });
});

app.get("/", (req, res) => {
  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: "Welcome to share fund system",
  });
});

app.use((req, res) => {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    message: `${req.originalUrl} route not found`,
  });
});

// Rest of the routes

app.use(errorMiddleware);

export default app;
