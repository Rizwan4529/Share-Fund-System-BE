import { ENUMS } from "#/utils/constants.js";
import { z } from "zod";

const settingValueSchema = z.any().refine((value) => {
  return (
    typeof value === "number" ||
    Array.isArray(value) ||
    (typeof value === "object" && value !== null && !Array.isArray(value))
  );
}, "Value must be an array, number or an object");

export const insertSettingsSchema = z.object({
  key: z.string().min(1, "Key is required"),
  category: z.string().min(1, "Category is required"),
  value: settingValueSchema,
  dataType: z
    .string()
    .min(1, "Data Type is required")
    .refine(
      (value) => Object.values(ENUMS.SETTINGS_DATA_TYPE).includes(value),
      "Invalid data type",
    ),
  description: z.string().optional(),
  effectiveDate: z.coerce.date().optional(),
});

export const updateSettingSchema = z.object({
  value: settingValueSchema,
  reason: z.string().optional(),
  effectiveDate: z.coerce.date().optional(),
});

export const settingKeyParamSchema = z.object({
  key: z.string().min(1, "Key is required"),
});

export const settingCategoryParamSchema = z.object({
  category: z.string().min(1, "Category is required"),
});
