import { validate, validateParams } from "#/middleware/validate.middleware.js";
import express from "express";
import {
  createLegalDocumentSchema,
  legalDocumentTypeParamSchema,
  legalDocumentVersionParamSchema,
  publishLegalDocumentSchema,
  updateLegalDocumentSchema,
} from "./legal-document.validator.js";
import {
  createLegalDocument,
  getLegalDocumentByType,
  getLegalDocumentVersion,
  listLegalDocuments,
  listLegalDocumentVersions,
  publishLegalDocument,
  updateLegalDocument,
} from "./legal-document.controller.js";
import { authenticate, authorize } from "#/middleware/auth.middleware.js";
import { ENUMS } from "#/utils/constants.js";

const router = express.Router();

router.get("/", authenticate, listLegalDocuments);
router.get(
  "/:documentType/versions/:version",
  authenticate,
  validateParams(legalDocumentVersionParamSchema),
  getLegalDocumentVersion,
);
router.get(
  "/:documentType/versions",
  authenticate,
  authorize(ENUMS.ROLES.ADMIN),
  validateParams(legalDocumentTypeParamSchema),
  listLegalDocumentVersions,
);
router.patch(
  "/:documentType/versions/:version/publish",
  authenticate,
  authorize(ENUMS.ROLES.ADMIN),
  validateParams(legalDocumentVersionParamSchema),
  validate(publishLegalDocumentSchema),
  publishLegalDocument,
);
router.get(
  "/:documentType",
  validateParams(legalDocumentTypeParamSchema),
  getLegalDocumentByType,
);
router.patch(
  "/:documentType",
  authenticate,
  authorize(ENUMS.ROLES.ADMIN),
  validateParams(legalDocumentTypeParamSchema),
  validate(updateLegalDocumentSchema),
  updateLegalDocument,
);
router.post(
  "/",
  authenticate,
  authorize(ENUMS.ROLES.ADMIN),
  validate(createLegalDocumentSchema),
  createLegalDocument,
);

export default router;
