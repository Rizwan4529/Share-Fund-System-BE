import { ENUMS } from "#/utils/constants.js";
import { z } from "zod";

const amount = z.number().nonnegative("Amount cannot be negative").optional();
const percentage = z.number().min(0).max(100).optional();
const answer = z.string().trim().max(2000).optional();

const profileTypeSchema = z
  .string()
  .refine(
    (value) => Object.values(ENUMS.SUCCESS_PROFILE_TYPE).includes(value),
    "Invalid profile type",
  );

const discretionaryLabelSchema = z
  .string()
  .refine(
    (value) => Object.values(ENUMS.DISCRETIONARY_RULE_LABEL).includes(value),
    "Invalid discretionary rule label",
  );

const financialsSchema = z.object({
  netMonthlyIncome: amount,
  essentialExpenses: amount,
  monthlyDebt: amount,
  currentSavings: amount,
  emergencySavings: amount,
  existingCommitments: amount,
  comfortableMonthlyAmount: amount,
});

const discretionaryRuleSchema = z.object({
  selectedPercentage: percentage,
  label: discretionaryLabelSchema.optional(),
  customPercentage: percentage,
});

const planningAnswersSchema = z.object({
  desiredResult: answer,
  whatIsBlocking: answer,
  wouldReducingExpenseHelp: answer,
  wouldIncreasingIncomeHelp: answer,
  willingToConsiderLongerTimeline: answer,
  goalPriorities: answer,
});

// userId, status, completionPercentage and accuracyConfirmed are server-owned;
// Zod strips them from the body because they are not declared here.
const profileFields = {
  financials: financialsSchema.optional(),
  employmentSource: z.string().trim().max(200).optional(),
  discretionaryRule: discretionaryRuleSchema.optional(),
  planningAnswers: planningAnswersSchema.optional(),
};

export const createSuccessProfileSchema = z.object({
  profileType: profileTypeSchema,
  ...profileFields,
});

export const updateSuccessProfileSchema = z
  .object({
    profileType: profileTypeSchema.optional(),
    ...profileFields,
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one field is required",
  );

export const completeSuccessProfileSchema = z.object({
  accuracyConfirmed: z.literal(true, {
    error: "You must confirm your profile information is accurate",
  }),
});
