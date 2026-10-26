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

// Any recorded amount counts, including a genuine $0 (no debt, no savings).
const isFinancialFilled = (value) => typeof value === "number" && value >= 0;

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

const countFilled = (section, fields, isFilled) =>
  fields.filter((field) => isFilled(section?.[field])).length;

/**
 * The parts still unanswered, in questionnaire order, as participant-facing
 * labels. Empty when the profile can be completed.
 */
export const missingSections = (profile) => {
  const missing = [];
  if (!profile.profileType) missing.push("who this plan is for");
  const financials = countFilled(profile.financials, FINANCIAL_FIELDS, isFinancialFilled);
  if (financials < FINANCIAL_FIELDS.length)
    missing.push(`monthly finances (${financials} of ${FINANCIAL_FIELDS.length} answered)`);
  if (!isDiscretionaryRuleFilled(profile.discretionaryRule))
    missing.push("discretionary spending rule");
  const answers = countFilled(profile.planningAnswers, PLANNING_ANSWER_FIELDS, isTextFilled);
  if (answers < PLANNING_ANSWER_FIELDS.length)
    missing.push(`planning questions (${answers} of ${PLANNING_ANSWER_FIELDS.length} answered)`);
  return missing;
};

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
