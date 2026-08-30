import { validate, validateParams } from "#/middleware/validate.middleware.js";
import express from "express";
import { authenticate, authorize } from "#/middleware/auth.middleware.js";
import { ENUMS } from "#/utils/constants.js";
import {
  createSettingCategorySchema,
  settingCategoryIdParamSchema,
  updateSettingCategorySchema,
} from "./setting-category.validator.js";
import {
  createSettingCategory,
  deleteSettingCategory,
  listSettingCategories,
  updateSettingCategory,
} from "./setting-category.controller.js";

const router = express.Router();

router.use(authenticate, authorize(ENUMS.ROLES.ADMIN));

router.get("/", listSettingCategories);
router.post("/", validate(createSettingCategorySchema), createSettingCategory);
router.patch(
  "/:id",
  validateParams(settingCategoryIdParamSchema),
  validate(updateSettingCategorySchema),
  updateSettingCategory,
);
router.delete(
  "/:id",
  validateParams(settingCategoryIdParamSchema),
  deleteSettingCategory,
);

export default router;
