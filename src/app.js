import express from "express";
import cors from "cors";
import { HTTP_STATUS } from "#/utils/constants.js";
import { errorMiddleware } from "#/middleware/error.middleware.js";
import { AppError } from "#/utils/appError.js";
import userRoutes from "#/features/users/user.routes.js";
import settingRoutes from "#/features/settings/setting.routes.js";
import founderPlanRoutes from "#/features/founder-plans/founder-plan.routes.js";
import legalDocumentRoutes from "#/features/legal-documents/legal-document.routes.js";
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

app.use("/api/v1", userRoutes);
app.use("/api/v1/settings", settingRoutes);
app.use("/api/v1/founder-plans", founderPlanRoutes);
app.use("/api/v1/legal-documents", legalDocumentRoutes);

// Register feature routes ABOVE the 404 handler.
// Anything that does not match a route falls through to 404, then errorMiddleware.

app.use((req, res, next) => {
  next(
    new AppError(`${req.originalUrl} route not found`, HTTP_STATUS.NOT_FOUND),
  );
});

app.use(errorMiddleware);

export default app;
