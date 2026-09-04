import { ENUMS, OBJECT_ID } from "#/utils/constants.js";
import { z } from "zod";

const nullableNumber = z.number().nullable().optional();

const activationRulesSchema = z
  .object({
    activationPercentageMin: nullableNumber,
    activationPercentageMax: nullableNumber,
    defaultActivationPercentage: nullableNumber,
    growthPeriodDays: nullableNumber,
    roundingIncrement: nullableNumber,
    minGoalAmount: nullableNumber,
    maxGoalAmount: nullableNumber,
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
