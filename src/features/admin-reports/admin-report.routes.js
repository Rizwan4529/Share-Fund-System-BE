import express from "express";
import {
  validateParams,
  validateQuery,
} from "#/middleware/validate.middleware.js";
import { authenticate, authorize } from "#/middleware/auth.middleware.js";
import { ENUMS } from "#/utils/constants.js";
import {
  listEnrollmentsQuerySchema,
  listPaymentsQuerySchema,
  paymentIdParamSchema,
  revenueQuerySchema,
} from "./admin-report.validator.js";
import {
  getOverview,
  getPayment,
  getRevenueSummary,
  listEnrollments,
  listPayments,
  resendPaymentReceipt,
} from "./admin-report.controller.js";

// Admin reports, mounted at /api/v1/admin (the one write is audited).
const router = express.Router();
router.use(authenticate, authorize(ENUMS.ROLES.ADMIN));

router.get("/enrollments", validateQuery(listEnrollmentsQuerySchema), listEnrollments);
router.get("/payments", validateQuery(listPaymentsQuerySchema), listPayments);
router.get("/payments/:id", validateParams(paymentIdParamSchema), getPayment);
router.post(
  "/payments/:id/resend-receipt",
  validateParams(paymentIdParamSchema),
  resendPaymentReceipt,
);
router.get("/revenue/summary", validateQuery(revenueQuerySchema), getRevenueSummary);
// Admin home metrics; the optional range applies to time-based metrics.
router.get("/overview", validateQuery(revenueQuerySchema), getOverview);

export default router;
