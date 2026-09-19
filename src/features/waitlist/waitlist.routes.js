import {
  validate,
  validateParams,
  validateQuery,
} from "#/middleware/validate.middleware.js";
import express from "express";
import { authenticate, authorize } from "#/middleware/auth.middleware.js";
import { ENUMS } from "#/utils/constants.js";
import {
  createWaitlistEntrySchema,
  listWaitlistQuerySchema,
  updateWaitlistEntrySchema,
  waitlistIdParamSchema,
} from "./waitlist.validator.js";
import {
  createWaitlistEntry,
  deleteWaitlistEntry,
  getWaitlistEntryById,
  listWaitlistEntries,
  updateWaitlistEntry,
} from "./waitlist.controller.js";

const router = express.Router();

// Public — landing form join
router.post("/", validate(createWaitlistEntrySchema), createWaitlistEntry);

// Admin
router.use(authenticate, authorize(ENUMS.ROLES.ADMIN));

router.get("/", validateQuery(listWaitlistQuerySchema), listWaitlistEntries);
router.get(
  "/:id",
  validateParams(waitlistIdParamSchema),
  getWaitlistEntryById,
);
router.patch(
  "/:id",
  validateParams(waitlistIdParamSchema),
  validate(updateWaitlistEntrySchema),
  updateWaitlistEntry,
);
router.delete(
  "/:id",
  validateParams(waitlistIdParamSchema),
  deleteWaitlistEntry,
);

export default router;
