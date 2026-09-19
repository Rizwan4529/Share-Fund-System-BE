import { OBJECT_ID } from "#/utils/constants.js";
import { z } from "zod";

const slugSchema = z
  .string()
  .trim()
  .min(1, "Slug is required")
  .regex(
    /^[a-z][a-z0-9_]*$/,
    "Slug must start with a letter and contain only lowercase letters, numbers, and underscores",
  );

export const createWaitlistCampaignCategorySchema = z.object({
  slug: slugSchema,
  label: z.string().trim().min(1, "Label is required").max(120),
  description: z.string().trim().max(500).optional().default(""),
  order: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const updateWaitlistCampaignCategorySchema = z
  .object({
    slug: slugSchema.optional(),
    label: z.string().trim().min(1, "Label is required").max(120).optional(),
    description: z.string().trim().max(500).optional(),
    order: z.number().int().optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one field is required",
  );

export const waitlistCampaignCategoryIdParamSchema = z.object({
  id: OBJECT_ID,
});
