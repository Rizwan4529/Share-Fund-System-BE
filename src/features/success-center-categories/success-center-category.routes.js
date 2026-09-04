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

router.use(authenticate);

router.get("/", listSuccessCenterCategories);
router.get(
  "/:id",
  validateParams(successCenterCategoryIdParamSchema),
  getSuccessCenterCategoryById,
);
router.post(
  "/",
  authorize(ENUMS.ROLES.ADMIN),
  validate(createSuccessCenterCategorySchema),
  createSuccessCenterCategory,
);
router.patch(
  "/:id",
  authorize(ENUMS.ROLES.ADMIN),
  validateParams(successCenterCategoryIdParamSchema),
  validate(updateSuccessCenterCategorySchema),
  updateSuccessCenterCategory,
);
router.delete(
  "/:id",
  authorize(ENUMS.ROLES.ADMIN),
  validateParams(successCenterCategoryIdParamSchema),
  deleteSuccessCenterCategory,
);

export default router;
