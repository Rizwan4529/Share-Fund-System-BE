import express from "express";
import cors from "cors";
import { HTTP_STATUS } from "#/utils/constants.js";
import { errorMiddleware } from "#/middleware/error.middleware.js";
import { AppError } from "#/utils/appError.js";
import userRoutes from "#/features/users/user.routes.js";
import settingRoutes from "#/features/settings/setting.routes.js";
import founderPlanRoutes from "#/features/founder-plans/founder-plan.routes.js";
import legalDocumentRoutes from "#/features/legal-documents/legal-document.routes.js";
import legalAcceptanceRoutes from "#/features/legal-acceptances/legal-acceptance.routes.js";
import auditLogRoutes from "#/features/audit-logs/audit-log.routes.js";
import successCenterProgramRoutes from "#/features/success-center-programs/success-center-program.routes.js";
import successCenterCategoryRoutes from "#/features/success-center-categories/success-center-category.routes.js";
import settingCategoryRoutes from "#/features/setting-categories/setting-category.routes.js";
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
      // console.log("origin", origin);
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
app.use("/api/v1/setting-categories", settingCategoryRoutes);
app.use("/api/v1/founder-plans", founderPlanRoutes);
app.use("/api/v1/legal-documents", legalDocumentRoutes);
app.use("/api/v1/legal-acceptances", legalAcceptanceRoutes);
app.use("/api/v1/audit-logs", auditLogRoutes);
app.use("/api/v1/success-center-categories", successCenterCategoryRoutes);
app.use("/api/v1/success-center-programs", successCenterProgramRoutes);

// Register feature routes ABOVE the 404 handler.
// Anything that does not match a route falls through to 404, then errorMiddleware.

app.use((req, res, next) => {
  next(
    new AppError(`${req.originalUrl} route not found`, HTTP_STATUS.NOT_FOUND),
  );
});

app.use(errorMiddleware);

export default app;
