import express from "express";
import { validate, validateParams } from "#/middleware/validate.middleware.js";
import { authenticate, authorize } from "#/middleware/auth.middleware.js";
import { ENUMS } from "#/utils/constants.js";
import {
  calculateActivationSchema,
  selectionIdParamSchema,
} from "./recommendation.validator.js";
import {
  calculateActivation,
  getActivationForSelection,
  getActivationForSelectionAsAdmin,
} from "./recommendation.controller.js";

// Participant: /api/v1/activation — acts only on the user's own selections.
const router = express.Router();
router.use(authenticate);

router.post("/calculate", validate(calculateActivationSchema), calculateActivation);
router.get(
  "/selection/:selectionId",
  validateParams(selectionIdParamSchema),
  getActivationForSelection,
);

// Admin (read-only): /api/v1/admin/recommendations
export const adminRecommendationRouter = express.Router();
adminRecommendationRouter.use(authenticate, authorize(ENUMS.ROLES.ADMIN));

adminRecommendationRouter.get(
  "/:selectionId",
  validateParams(selectionIdParamSchema),
  getActivationForSelectionAsAdmin,
);

export default router;
