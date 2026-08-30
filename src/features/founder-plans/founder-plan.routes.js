import { validate, validateParams } from "#/middleware/validate.middleware.js";
import express from "express";
import {
  createFounderPlanSchema,
  founderPlanIdParamSchema,
  toggleFounderPlanAvailabilitySchema,
  updateFounderPlanSchema,
} from "./founder-plan.validator.js";
import {
  createFounderPlan,
  getFounderPlanById,
  listFounderPlans,
  toggleFounderPlanAvailability,
  updateFounderPlan,
} from "./founder-plan.controller.js";
import { authenticate, authorize } from "#/middleware/auth.middleware.js";
import { ENUMS } from "#/utils/constants.js";

const router = express.Router();

router.use(authenticate);

router.get("/", listFounderPlans);
router.get(
  "/:id",
  validateParams(founderPlanIdParamSchema),
  getFounderPlanById,
);
router.post(
  "/",
  authorize(ENUMS.ROLES.ADMIN),
  validate(createFounderPlanSchema),
  createFounderPlan,
);
router.patch(
  "/:id/availability",
  authorize(ENUMS.ROLES.ADMIN),
  validateParams(founderPlanIdParamSchema),
  validate(toggleFounderPlanAvailabilitySchema),
  toggleFounderPlanAvailability,
);
router.patch(
  "/:id",
  authorize(ENUMS.ROLES.ADMIN),
  validateParams(founderPlanIdParamSchema),
  validate(updateFounderPlanSchema),
  updateFounderPlan,
);

export default router;
