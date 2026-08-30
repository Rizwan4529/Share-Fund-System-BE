import { OBJECT_ID } from "#/utils/constants.js";
import { z } from "zod";

const slugSchema = z
  .string()
  .min(1, "Slug is required")
  .regex(
    /^[a-zA-Z][a-zA-Z0-9]*$/,
    "Slug must start with a letter and contain only letters and numbers",
  );

export const createSettingCategorySchema = z.object({
  slug: slugSchema,
  label: z.string().min(1, "Label is required"),
  description: z.string().optional(),
  order: z.number().int().optional(),
});

export const updateSettingCategorySchema = z
  .object({
    slug: slugSchema.optional(),
    label: z.string().min(1, "Label is required").optional(),
    description: z.string().optional(),
    order: z.number().int().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, "At least one field is required");

export const settingCategoryIdParamSchema = z.object({
  id: OBJECT_ID,
});
