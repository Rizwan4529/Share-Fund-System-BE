import express from "express";
import { validate } from "#/middleware/validate.middleware.js";
import {
  authenticate,
  requireVerifiedEmail,
} from "#/middleware/auth.middleware.js";
import {
  completeSuccessProfileSchema,
  createSuccessProfileSchema,
  updateSuccessProfileSchema,
} from "./success-profile.validator.js";
import {
  completeMySuccessProfile,
  getMySuccessProfile,
  updateMySuccessProfile,
  upsertMySuccessProfile,
} from "./success-profile.controller.js";

const router = express.Router();

// Every route acts on the authenticated user's own profile (userId from req.user).
router.use(authenticate);

router.get("/me", getMySuccessProfile);
router.post(
  "/",
  requireVerifiedEmail,
  validate(createSuccessProfileSchema),
  upsertMySuccessProfile,
);
router.patch(
  "/me",
  requireVerifiedEmail,
  validate(updateSuccessProfileSchema),
  updateMySuccessProfile,
);
router.patch(
  "/me/complete",
  requireVerifiedEmail,
  validate(completeSuccessProfileSchema),
  completeMySuccessProfile,
);

export default router;
