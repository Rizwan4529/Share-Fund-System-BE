import { validate, validateParams } from "#/middleware/validate.middleware.js";
import express from "express";
import {
  insertSettingsSchema,
  settingCategoryParamSchema,
  settingKeyParamSchema,
  updateSettingSchema,
} from "./setting.validator.js";
import {
  getSettingByKey,
  getSettingsByCategory,
  insertSettings,
  listSettings,
  updateSetting,
} from "./setting.controller.js";
import { authenticate, authorize } from "#/middleware/auth.middleware.js";
import { ENUMS } from "#/utils/constants.js";

const router = express.Router();

router.use(authenticate, authorize(ENUMS.ROLES.ADMIN));

router.get("/", listSettings);
router.get(
  "/category/:category",
  validateParams(settingCategoryParamSchema),
  getSettingsByCategory,
);
router.get("/:key", validateParams(settingKeyParamSchema), getSettingByKey);
router.patch(
  "/:key",
  validateParams(settingKeyParamSchema),
  validate(updateSettingSchema),
  updateSetting,
);
router.post("/", validate(insertSettingsSchema), insertSettings);

export default router;
