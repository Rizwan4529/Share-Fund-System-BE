import express from "express";
import { validateQuery } from "#/middleware/validate.middleware.js";
import { authenticate, authorize } from "#/middleware/auth.middleware.js";
import { ENUMS } from "#/utils/constants.js";
import {
  exportEnrollmentsQuerySchema,
  exportParticipantsQuerySchema,
  exportPaymentsQuerySchema,
} from "./admin-export.validator.js";
import {
  exportEnrollments,
  exportParticipants,
  exportPayments,
} from "./admin-export.controller.js";

// CSV exports, mounted at /api/v1/admin/export — admin-only and audit-logged.
const router = express.Router();
router.use(authenticate, authorize(ENUMS.ROLES.ADMIN));

router.get("/participants", validateQuery(exportParticipantsQuerySchema), exportParticipants);
router.get("/enrollments", validateQuery(exportEnrollmentsQuerySchema), exportEnrollments);
router.get("/payments", validateQuery(exportPaymentsQuerySchema), exportPayments);

export default router;
