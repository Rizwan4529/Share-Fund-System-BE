import { ENUMS } from "#/utils/constants.js";
import { z } from "zod";

const documentTypeSchema = z
  .string()
  .min(1, "Document type is required")
  .refine(
    (value) => Object.values(ENUMS.LEGAL_DOCUMENT_TYPE).includes(value),
    "Invalid document type",
  );

export const createLegalDocumentSchema = z.object({
  documentType: documentTypeSchema,
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
});

export const updateLegalDocumentSchema = z
  .object({
    title: z.string().min(1, "Title is required").optional(),
    content: z.string().min(1, "Content is required").optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one field is required",
  );

export const publishLegalDocumentSchema = z.object({
  effectiveDate: z.coerce.date().optional(),
});

export const legalDocumentTypeParamSchema = z.object({
  documentType: documentTypeSchema,
});

export const legalDocumentVersionParamSchema = z.object({
  documentType: documentTypeSchema,
  version: z.coerce
    .number({ error: "Version is required" })
    .int()
    .positive("Version must be a positive integer"),
});
