import { ENUMS, OBJECT_ID } from "#/utils/constants.js";
import { z } from "zod";

const slugSchema = z
  .string()
  .min(1, "Slug is required")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Slug must be lowercase letters, numbers, and hyphens only",
  );

const statusSchema = z
  .string()
  .refine(
    (value) =>
      Object.values(ENUMS.SUCCESS_CENTER_CATEGORY_STATUS).includes(value),
    "Invalid status",
  );

export const createSuccessCenterCategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: slugSchema,
  description: z.string().optional(),
  programsIntroduction: z.string().optional(),
  order: z.number().int().optional(),
  image: z.string().optional(),
  icon: z.string().optional(),
  status: statusSchema.optional(),
});

export const updateSuccessCenterCategorySchema = z
  .object({
    name: z.string().min(1, "Name is required").optional(),
    slug: slugSchema.optional(),
    description: z.string().optional(),
    programsIntroduction: z.string().optional(),
    order: z.number().int().optional(),
    image: z.string().optional(),
    icon: z.string().optional(),
    status: statusSchema.optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one field is required",
  );

export const successCenterCategoryIdParamSchema = z.object({
  id: OBJECT_ID,
});
