import express from "express";
import { validateParams } from "#/middleware/validate.middleware.js";
import { optionalAuthenticate } from "#/middleware/auth.middleware.js";
import {
  categoryIdParamSchema,
  programIdParamSchema,
} from "./success-center.validator.js";
import {
  getProgram,
  listCategories,
  listCategoryPrograms,
} from "./success-center.controller.js";

const router = express.Router();

// Browsing is free and public (brief: browse Success Centers before
// registering). Read-only; a logged-in caller is still recognised.
router.use(optionalAuthenticate);

router.get("/categories", listCategories);
router.get(
  "/categories/:categoryId/programs",
  validateParams(categoryIdParamSchema),
  listCategoryPrograms,
);
router.get(
  "/programs/:programId",
  validateParams(programIdParamSchema),
  getProgram,
);

export default router;
