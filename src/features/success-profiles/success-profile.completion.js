import { ENUMS } from "#/utils/constants.js";

/**
 * Section weights for completionPercentage. They must add up to 100.
 * Tune these to change how much each part of the questionnaire counts.
 */
export const COMPLETION_WEIGHTS = {
  profileType: 15,
  financials: 50, // split evenly across FINANCIAL_FIELDS
  discretionaryRule: 15,
  planningAnswers: 20, // split evenly across PLANNING_ANSWER_FIELDS
};

export const FINANCIAL_FIELDS = [
  "netMonthlyIncome",
  "essentialExpenses",
  "monthlyDebt",
  "currentSavings",
  "emergencySavings",
  "existingCommitments",
  "comfortableMonthlyAmount",
];

export const PLANNING_ANSWER_FIELDS = [
  "desiredResult",
  "whatIsBlocking",
  "wouldReducingExpenseHelp",
  "wouldIncreasingIncomeHelp",
  "willingToConsiderLongerTimeline",
  "goalPriorities",
];

// Financial fields default to 0, so only a positive value counts as answered.
const isFinancialFilled = (value) => typeof value === "number" && value > 0;

const isTextFilled = (value) =>
  typeof value === "string" && value.trim().length > 0;

// A rule counts once a label is picked; "custom" also needs its percentage.
const isDiscretionaryRuleFilled = (rule) => {
  if (!rule?.label) return false;
  if (rule.label === ENUMS.DISCRETIONARY_RULE_LABEL.CUSTOM)
    return typeof rule.customPercentage === "number";
  return true;
};

const fractionFilled = (section, fields, isFilled) =>
  fields.filter((field) => isFilled(section?.[field])).length / fields.length;

/** Returns an integer 0–100 for a SuccessProfile document or plain object. */
export const calculateCompletionPercentage = (profile) => {
  const score =
    (profile.profileType ? COMPLETION_WEIGHTS.profileType : 0) +
    COMPLETION_WEIGHTS.financials *
      fractionFilled(profile.financials, FINANCIAL_FIELDS, isFinancialFilled) +
    (isDiscretionaryRuleFilled(profile.discretionaryRule)
      ? COMPLETION_WEIGHTS.discretionaryRule
      : 0) +
    COMPLETION_WEIGHTS.planningAnswers *
      fractionFilled(
        profile.planningAnswers,
        PLANNING_ANSWER_FIELDS,
        isTextFilled,
      );

  return Math.min(100, Math.round(score));
};
