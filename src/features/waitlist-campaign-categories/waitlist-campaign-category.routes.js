import {
  validate,
  validateParams,
} from "#/middleware/validate.middleware.js";
import express from "express";
import {
  authenticate,
  authorize,
  optionalAuthenticate,
} from "#/middleware/auth.middleware.js";
import { ENUMS } from "#/utils/constants.js";
import {
  createWaitlistCampaignCategorySchema,
  updateWaitlistCampaignCategorySchema,
  waitlistCampaignCategoryIdParamSchema,
} from "./waitlist-campaign-category.validator.js";
import {
  createWaitlistCampaignCategory,
  deleteWaitlistCampaignCategory,
  getWaitlistCampaignCategoryById,
  listWaitlistCampaignCategories,
  updateWaitlistCampaignCategory,
} from "./waitlist-campaign-category.controller.js";

const router = express.Router();

// Public GET (admins may pass ?includeInactive=true with a Bearer token)
router.get("/", optionalAuthenticate, listWaitlistCampaignCategories);
router.get(
  "/:id",
  validateParams(waitlistCampaignCategoryIdParamSchema),
  getWaitlistCampaignCategoryById,
);

// Admin mutations
router.post(
  "/",
  authenticate,
  authorize(ENUMS.ROLES.ADMIN),
  validate(createWaitlistCampaignCategorySchema),
  createWaitlistCampaignCategory,
);
router.patch(
  "/:id",
  authenticate,
  authorize(ENUMS.ROLES.ADMIN),
  validateParams(waitlistCampaignCategoryIdParamSchema),
  validate(updateWaitlistCampaignCategorySchema),
  updateWaitlistCampaignCategory,
);
router.delete(
  "/:id",
  authenticate,
  authorize(ENUMS.ROLES.ADMIN),
  validateParams(waitlistCampaignCategoryIdParamSchema),
  deleteWaitlistCampaignCategory,
);

export default router;
