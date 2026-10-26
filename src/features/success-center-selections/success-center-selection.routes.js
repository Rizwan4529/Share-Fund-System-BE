import express from "express";
import {
  validate,
  validateParams,
  validateQuery,
} from "#/middleware/validate.middleware.js";
import {
  authenticate,
  requireVerifiedEmail,
} from "#/middleware/auth.middleware.js";
import {
  createSelectionSchema,
  listMySelectionsQuerySchema,
  selectionIdParamSchema,
} from "./success-center-selection.validator.js";
import {
  createSelection,
  listMySelections,
  removeSelection,
} from "./success-center-selection.controller.js";

const router = express.Router();

// Every route acts on the authenticated user's own selections.
router.use(authenticate);

router.post("/", requireVerifiedEmail, validate(createSelectionSchema), createSelection);
router.get("/me", validateQuery(listMySelectionsQuerySchema), listMySelections);
router.patch(
  "/:id/remove",
  requireVerifiedEmail,
  validateParams(selectionIdParamSchema),
  removeSelection,
);

export default router;
