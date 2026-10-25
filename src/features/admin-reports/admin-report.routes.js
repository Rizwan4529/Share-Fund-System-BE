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
  getPayment,
  getRevenueSummary,
  listEnrollments,
  listPayments,
} from "./admin-report.controller.js";

// Read-only admin reports, mounted at /api/v1/admin.
const router = express.Router();
router.use(authenticate, authorize(ENUMS.ROLES.ADMIN));

router.get("/enrollments", validateQuery(listEnrollmentsQuerySchema), listEnrollments);
router.get("/payments", validateQuery(listPaymentsQuerySchema), listPayments);
router.get("/payments/:id", validateParams(paymentIdParamSchema), getPayment);
router.get("/revenue/summary", validateQuery(revenueQuerySchema), getRevenueSummary);

export default router;
