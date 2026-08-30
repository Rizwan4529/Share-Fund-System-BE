import { validate, validateParams } from "#/middleware/validate.middleware.js";
import express from "express";
import {
  legalAcceptanceDocumentTypeParamSchema,
  legalAcceptanceUserDocumentParamSchema,
  legalAcceptanceUserParamSchema,
  recordLegalAcceptanceSchema,
} from "./legal-acceptance.validator.js";
import {
  checkMyCurrentAcceptance,
  checkUserCurrentAcceptance,
  getMyLegalAcceptances,
  getUserLegalAcceptances,
  recordLegalAcceptance,
} from "./legal-acceptance.controller.js";
import { authenticate, authorize } from "#/middleware/auth.middleware.js";
import { ENUMS } from "#/utils/constants.js";

const router = express.Router();

router.use(authenticate);

router.post("/", validate(recordLegalAcceptanceSchema), recordLegalAcceptance);
router.get(
  "/me/:documentType/current",
  validateParams(legalAcceptanceDocumentTypeParamSchema),
  checkMyCurrentAcceptance,
);
router.get("/me", getMyLegalAcceptances);
router.get(
  "/users/:userId/:documentType/current",
  authorize(ENUMS.ROLES.ADMIN),
  validateParams(legalAcceptanceUserDocumentParamSchema),
  checkUserCurrentAcceptance,
);
router.get(
  "/users/:userId",
  authorize(ENUMS.ROLES.ADMIN),
  validateParams(legalAcceptanceUserParamSchema),
  getUserLegalAcceptances,
);

export default router;
