import { validate, validateParams } from "#/middleware/validate.middleware.js";
import express from "express";
import { authenticate, authorize } from "#/middleware/auth.middleware.js";
import { ENUMS } from "#/utils/constants.js";
import {
  createSuccessCenterCategorySchema,
  successCenterCategoryIdParamSchema,
  updateSuccessCenterCategorySchema,
} from "./success-center-category.validator.js";
import {
  createSuccessCenterCategory,
  deleteSuccessCenterCategory,
  getSuccessCenterCategoryById,
  listSuccessCenterCategories,
  updateSuccessCenterCategory,
} from "./success-center-category.controller.js";

const router = express.Router();

// The participant catalog is served by /success-centers (published only).
router.use(authenticate, authorize(ENUMS.ROLES.ADMIN));

router.get("/", listSuccessCenterCategories);
router.get(
  "/:id",
  validateParams(successCenterCategoryIdParamSchema),
  getSuccessCenterCategoryById,
);
router.post(
  "/",
  validate(createSuccessCenterCategorySchema),
  createSuccessCenterCategory,
);
router.patch(
  "/:id",
  validateParams(successCenterCategoryIdParamSchema),
  validate(updateSuccessCenterCategorySchema),
  updateSuccessCenterCategory,
);
router.delete(
  "/:id",
  validateParams(successCenterCategoryIdParamSchema),
  deleteSuccessCenterCategory,
);

export default router;
