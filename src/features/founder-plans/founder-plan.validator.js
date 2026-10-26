import { ENUMS, OBJECT_ID } from "#/utils/constants.js";
import { z } from "zod";

const capAmount = z
  .number({ error: "Funding cap must be a number" })
  .min(0, "Funding cap can't be negative")
  .nullable()
  .optional();

const fundingCapSchema = z.object({
  standard: capAmount,
  premium: capAmount,
});

// Checkout refuses a $0 tier, so a plan must cost something to be listable.
const priceSchema = z
  .number({ error: "Price is required" })
  .positive("Price must be greater than 0");

export const createFounderPlanSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .refine(
      (value) => Object.values(ENUMS.FOUNDER_PLAN_NAME).includes(value),
      "Invalid founder plan name",
    ),
  price: priceSchema,
  includedSuccessCenters: z
    .array(OBJECT_ID)
    .min(1, "At least one success center is required"),
  fundingCap: fundingCapSchema.optional(),
  eligiblePrograms: z.array(OBJECT_ID).optional(),
  majorOneTimeProgramsEligible: z.boolean().optional(),
  priorityLevel: z
    .string()
    .refine(
      (value) =>
        Object.values(ENUMS.FOUNDER_PLAN_PRIORITY_LEVEL).includes(value),
      "Invalid priority level",
    )
    .optional(),
  bmisPlanningLevel: z
    .string()
    .refine(
      (value) =>
        Object.values(ENUMS.FOUNDER_PLAN_BMIS_PLANNING_LEVEL).includes(value),
      "Invalid BMIS planning level",
    )
    .optional(),
  founderBenefitsVersion: z.string().optional(),
  status: z
    .string()
    .refine(
      (value) => Object.values(ENUMS.FOUNDER_PLAN_STATUS).includes(value),
      "Invalid status",
    )
    .optional(),
});

export const updateFounderPlanSchema = z
  .object({
    price: priceSchema.optional(),
    includedSuccessCenters: z
      .array(OBJECT_ID)
      .min(1, "At least one success center is required")
      .optional(),
    fundingCap: fundingCapSchema.optional(),
    eligiblePrograms: z.array(OBJECT_ID).optional(),
    majorOneTimeProgramsEligible: z.boolean().optional(),
    priorityLevel: z
      .string()
      .refine(
        (value) =>
          Object.values(ENUMS.FOUNDER_PLAN_PRIORITY_LEVEL).includes(value),
        "Invalid priority level",
      )
      .optional(),
    bmisPlanningLevel: z
      .string()
      .refine(
        (value) =>
          Object.values(ENUMS.FOUNDER_PLAN_BMIS_PLANNING_LEVEL).includes(value),
        "Invalid BMIS planning level",
      )
      .optional(),
    founderBenefitsVersion: z.string().optional(),
    status: z
      .string()
      .refine(
        (value) => Object.values(ENUMS.FOUNDER_PLAN_STATUS).includes(value),
        "Invalid status",
      )
      .optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one field is required",
  );

export const toggleFounderPlanAvailabilitySchema = z.object({
  status: z
    .string()
    .min(1, "Status is required")
    .refine(
      (value) => Object.values(ENUMS.FOUNDER_PLAN_STATUS).includes(value),
      "Invalid status",
    ),
});

export const founderPlanIdParamSchema = z.object({
  id: OBJECT_ID,
});
