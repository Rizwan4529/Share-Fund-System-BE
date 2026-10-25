import express from "express";
import { validateParams } from "#/middleware/validate.middleware.js";
import { authenticate } from "#/middleware/auth.middleware.js";
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

// Participant browsing: login required, no payment or selection check.
router.use(authenticate);

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
