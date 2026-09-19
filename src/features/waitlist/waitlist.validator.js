import { ENUMS, OBJECT_ID } from "#/utils/constants.js";
import { z } from "zod";

const campaignCategorySchema = z
  .string()
  .trim()
  .min(1, "Campaign category is required");

const statusSchema = z
  .string()
  .min(1, "Status is required")
  .refine(
    (value) => Object.values(ENUMS.WAITLIST_STATUS).includes(value),
    "Invalid waitlist status",
  );

export const createWaitlistEntrySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(120, "Name must be 120 characters or fewer"),
  email: z.string().trim().email("Please provide a valid email address"),
  campaignCategory: campaignCategorySchema,
  message: z
    .string()
    .trim()
    .max(500, "Message must be 500 characters or fewer")
    .optional()
    .default(""),
});

export const updateWaitlistEntrySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Name is required")
      .max(120, "Name must be 120 characters or fewer")
      .optional(),
    email: z
      .string()
      .trim()
      .email("Please provide a valid email address")
      .optional(),
    campaignCategory: campaignCategorySchema.optional(),
    message: z
      .string()
      .trim()
      .max(500, "Message must be 500 characters or fewer")
      .optional(),
    status: statusSchema.optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one field is required",
  );

export const waitlistIdParamSchema = z.object({
  id: OBJECT_ID,
});

export const listWaitlistQuerySchema = z.object({
  campaignCategory: campaignCategorySchema.optional(),
  status: statusSchema.optional(),
  search: z.string().trim().optional(),
});
