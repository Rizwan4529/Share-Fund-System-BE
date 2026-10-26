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
import waitlistRoutes from "#/features/waitlist/waitlist.routes.js";
import waitlistCampaignCategoryRoutes from "#/features/waitlist-campaign-categories/waitlist-campaign-category.routes.js";
import successProfileRoutes from "#/features/success-profiles/success-profile.routes.js";
import adminParticipantRoutes from "#/features/admin-participants/admin-participant.routes.js";
import successCenterRoutes from "#/features/success-centers/success-center.routes.js";
import successCenterSelectionRoutes from "#/features/success-center-selections/success-center-selection.routes.js";
import activationRoutes, {
  adminRecommendationRouter,
} from "#/features/recommendations/recommendation.routes.js";
import paymentRoutes from "#/features/payments/payment.routes.js";
import adminReportRoutes from "#/features/admin-reports/admin-report.routes.js";
import adminExportRoutes from "#/features/admin-exports/admin-export.routes.js";
import participantStatusRoutes from "#/features/participant-status/participant-status.routes.js";
import { stripeWebhook } from "#/features/payments/payment.controller.js";
const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "https://share-fund-system-fe.vercel.app",
        "https://www.sharefundsystem.com",
        "https://sharefundsystem.com",
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
    // Lets the admin CSV export download keep the server's filename.
    exposedHeaders: ["Content-Disposition", "X-Export-Row-Count"],
  }),
);

// Stripe webhook needs the RAW body for signature verification, so it is
// registered before the JSON parser.
app.post(
  "/api/v1/payments/webhook",
  express.raw({ type: "application/json", limit: "1mb" }),
  stripeWebhook,
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
app.use("/api/v1/success-profile", successProfileRoutes);
app.use("/api/v1/admin/participants", adminParticipantRoutes);
app.use(
  "/api/v1/success-centers/selections",
  successCenterSelectionRoutes,
);
app.use("/api/v1/success-centers", successCenterRoutes);
app.use("/api/v1/activation", activationRoutes);
app.use("/api/v1/admin/recommendations", adminRecommendationRouter);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/admin/export", adminExportRoutes);
// Admin read-only reports (enrollments, payments, revenue). Mounted after the
// more specific /admin/* routers above.
app.use("/api/v1/admin", adminReportRoutes);
app.use("/api/v1/me", participantStatusRoutes);
app.use(
  "/api/v1/waitlist/campaign-categories",
  waitlistCampaignCategoryRoutes,
);
app.use("/api/v1/waitlist", waitlistRoutes);

// Register feature routes ABOVE the 404 handler.
// Anything that does not match a route falls through to 404, then errorMiddleware.

app.use((req, res, next) => {
  next(
    new AppError(`${req.originalUrl} route not found`, HTTP_STATUS.NOT_FOUND),
  );
});

app.use(errorMiddleware);

export default app;
