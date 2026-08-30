import { ENUMS, OBJECT_ID } from "#/utils/constants.js";
import { z } from "zod";

const documentTypeSchema = z
  .string()
  .min(1, "Document type is required")
  .refine(
    (value) => Object.values(ENUMS.LEGAL_DOCUMENT_TYPE).includes(value),
    "Invalid document type",
  );

export const recordLegalAcceptanceSchema = z.object({
  documentType: documentTypeSchema,
  context: z
    .string()
    .min(1, "Context is required")
    .refine(
      (value) => Object.values(ENUMS.LEGAL_ACCEPTANCE_CONTEXT).includes(value),
      "Invalid context",
    ),
});

export const legalAcceptanceDocumentTypeParamSchema = z.object({
  documentType: documentTypeSchema,
});

export const legalAcceptanceUserParamSchema = z.object({
  userId: OBJECT_ID,
});

export const legalAcceptanceUserDocumentParamSchema = z.object({
  userId: OBJECT_ID,
  documentType: documentTypeSchema,
});
