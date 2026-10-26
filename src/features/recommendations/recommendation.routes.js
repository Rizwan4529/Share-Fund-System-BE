import express from "express";
import {
  validate,
  validateParams,
  validateQuery,
} from "#/middleware/validate.middleware.js";
import {
  authenticate,
  authorize,
  requireVerifiedEmail,
} from "#/middleware/auth.middleware.js";
import { ENUMS } from "#/utils/constants.js";
import {
  adjustRecommendationSchema,
  calculateActivationSchema,
  listRecommendationsQuerySchema,
  recommendationIdParamSchema,
  resetRecommendationSchema,
  selectOptionSchema,
  selectionIdParamSchema,
} from "./recommendation.validator.js";
import {
  adjustRecommendation,
  approveRecommendation,
  calculateActivation,
  getActivationForSelection,
  getRecommendationForReview,
  listRecommendationsForReview,
  resetRecommendation,
  selectActivationOption,
} from "./recommendation.controller.js";

// Participant: /api/v1/activation — acts only on the user's own selections.
const router = express.Router();
router.use(authenticate);

router.post(
  "/calculate",
  requireVerifiedEmail,
  validate(calculateActivationSchema),
  calculateActivation,
);
router.get(
  "/selection/:selectionId",
  validateParams(selectionIdParamSchema),
  getActivationForSelection,
);
router.patch(
  "/selection/:selectionId/option",
  requireVerifiedEmail,
  validateParams(selectionIdParamSchema),
  validate(selectOptionSchema),
  selectActivationOption,
);

// Admin review: /api/v1/admin/recommendations — every write is audit-logged.
export const adminRecommendationRouter = express.Router();
adminRecommendationRouter.use(authenticate, authorize(ENUMS.ROLES.ADMIN));

adminRecommendationRouter.get(
  "/",
  validateQuery(listRecommendationsQuerySchema),
  listRecommendationsForReview,
);
adminRecommendationRouter.get(
  "/:id",
  validateParams(recommendationIdParamSchema),
  getRecommendationForReview,
);
adminRecommendationRouter.patch(
  "/:id/approve",
  validateParams(recommendationIdParamSchema),
  approveRecommendation,
);
adminRecommendationRouter.patch(
  "/:id/adjust",
  validateParams(recommendationIdParamSchema),
  validate(adjustRecommendationSchema),
  adjustRecommendation,
);
adminRecommendationRouter.patch(
  "/:id/reset",
  validateParams(recommendationIdParamSchema),
  validate(resetRecommendationSchema),
  resetRecommendation,
);

export default router;
