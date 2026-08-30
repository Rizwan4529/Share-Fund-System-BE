import { validateQuery } from "#/middleware/validate.middleware.js";
import express from "express";
import { listAuditLogsQuerySchema } from "./audit-log.validator.js";
import { listAuditLogs } from "./audit-log.controller.js";
import { authenticate, authorize } from "#/middleware/auth.middleware.js";
import { ENUMS } from "#/utils/constants.js";

const router = express.Router();

router.use(authenticate, authorize(ENUMS.ROLES.ADMIN));

router.get("/", validateQuery(listAuditLogsQuerySchema), listAuditLogs);

export default router;
