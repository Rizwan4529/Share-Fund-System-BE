import { ENUMS, OBJECT_ID } from "#/utils/constants.js";
import { z } from "zod";

// Every rule may be null (= use the settings value). Limits match the global
// settings validation (setting-rules.js); min/max pairs are checked against
// the merged rules in the service, since a PATCH may send only one side.
const optional = (schema) => schema.nullable().optional();
const number = (label) => z.number({ error: `${label} must be a number` });
const percent = (label) =>
  number(label).min(0, `${label} can't be negative`).max(100, `${label} can't be more than 100%`);
const dayCount = (label) =>
  number(label).int(`${label} must be a whole number of days`).min(0, `${label} can't be negative`);

const activationRulesSchema = z
  .object({
    activationPercentageMin: optional(percent("Min activation %")),
    activationPercentageMax: optional(
      percent("Max activation %").refine((value) => value > 0, "Max activation % must be more than 0%"),
    ),
    defaultActivationPercentage: optional(
      percent("Default activation %").refine((value) => value > 0, "Default activation % must be more than 0%"),
    ),
    growthPeriodDays: optional(dayCount("Growth period")),
    eligibilityOffsetDays: optional(dayCount("Eligibility offset")),
    fundingStartOffsetDays: optional(dayCount("Funding estimate start")),
    fundingRangeDays: optional(dayCount("Funding range width")),
    roundingIncrement: optional(number("Rounding increment").positive("Rounding increment must be more than 0")),
    minGoalAmount: optional(number("Minimum goal").min(0, "Minimum goal can't be negative")),
    maxGoalAmount: optional(number("Maximum goal").positive("Maximum goal must be more than 0")),
  })
  .optional();

const statusSchema = z
  .string()
  .refine(
    (value) =>
      Object.values(ENUMS.SUCCESS_CENTER_PROGRAM_STATUS).includes(value),
    "Invalid status",
  );

const programTypeSchema = z
  .string()
  .refine(
    (value) =>
      Object.values(ENUMS.SUCCESS_CENTER_PROGRAM_TYPE).includes(value),
    "Invalid program type",
  );

const goalNatureSchema = z
  .string()
  .refine(
    (value) =>
      Object.values(ENUMS.SUCCESS_CENTER_GOAL_NATURE).includes(value),
    "Invalid goal nature",
  );

export const createSuccessCenterProgramSchema = z.object({
  categoryId: OBJECT_ID,
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  educationalContent: z.string().optional(),
  status: statusSchema.optional(),
  programType: programTypeSchema.optional(),
  goalNature: goalNatureSchema.optional(),
  activationRules: activationRulesSchema,
  order: z.number().int().optional(),
});

export const updateSuccessCenterProgramSchema = z
  .object({
    categoryId: OBJECT_ID.optional(),
    name: z.string().min(1, "Name is required").optional(),
    description: z.string().optional(),
    educationalContent: z.string().optional(),
    status: statusSchema.optional(),
    programType: programTypeSchema.optional(),
    goalNature: goalNatureSchema.optional(),
    activationRules: activationRulesSchema,
    order: z.number().int().optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one field is required",
  );

export const successCenterProgramIdParamSchema = z.object({
  id: OBJECT_ID,
});

export const listSuccessCenterProgramsQuerySchema = z.object({
  categoryId: OBJECT_ID.optional(),
  status: statusSchema.optional(),
});
