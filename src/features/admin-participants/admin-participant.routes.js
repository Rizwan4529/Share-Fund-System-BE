import express from "express";
import {
  validate,
  validateParams,
  validateQuery,
} from "#/middleware/validate.middleware.js";
import { authenticate, authorize } from "#/middleware/auth.middleware.js";
import { ENUMS } from "#/utils/constants.js";
import {
  listParticipantsQuerySchema,
  participantIdParamSchema,
  updateParticipantAccessSchema,
  updateParticipantStatusSchema,
} from "./admin-participant.validator.js";
import {
  getParticipantById,
  listParticipants,
  updateParticipantAccess,
  updateParticipantStatus,
} from "./admin-participant.controller.js";

const router = express.Router();

// Every route needs an authenticated admin; writes are audit-logged.
router.use(authenticate, authorize(ENUMS.ROLES.ADMIN));

router.get("/", validateQuery(listParticipantsQuerySchema), listParticipants);
router.get(
  "/:userId",
  validateParams(participantIdParamSchema),
  getParticipantById,
);
router.patch(
  "/:userId/status",
  validateParams(participantIdParamSchema),
  validate(updateParticipantStatusSchema),
  updateParticipantStatus,
);
router.patch(
  "/:userId/access",
  validateParams(participantIdParamSchema),
  validate(updateParticipantAccessSchema),
  updateParticipantAccess,
);

export default router;
