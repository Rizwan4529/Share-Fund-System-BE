import { ENUMS } from "#/utils/constants.js";

/*
 * Activation requirement calculation — PURE: no DB, no settings reads, no
 * business constants. Every percentage, rounding increment, month count and
 * bound arrives through `rules` (resolved from program activationRules →
 * settings by activation-rules.js), so different programs produce different
 * results purely from configuration. Reusable by the future BMIS engine.
 */

const STATUS = ENUMS.RECOMMENDATION_AFFORDABILITY_STATUS;
const PLAN_LABELS = Object.values(ENUMS.RECOMMENDATION_LABEL); // fast → longer

/** A verified quote beats the participant's own estimate. */
export const resolveGoalAmount = (selection) => {
  const verified =
    selection.pricingSource === ENUMS.SUCCESS_CENTER_PRICING_SOURCE.VERIFIED &&
    selection.verifiedQuoteAmount != null;
  const goal = verified ? selection.verifiedQuoteAmount : selection.goalAmount;
  return typeof goal === "number" && goal > 0 ? goal : null;
};

const clamp = (value, min, max) => {
  let result = value;
  if (min != null) result = Math.max(result, min);
  if (max != null) result = Math.min(result, max);
  return result;
};

/**
 * Round UP to the next multiple of `increment`. toPrecision(12) strips
 * floating-point noise (e.g. 400.00000000001) so exact multiples aren't
 * bumped up a whole increment.
 */
const roundUpToIncrement = (value, increment) =>
  Math.ceil(Number((value / increment).toPrecision(12))) * increment;

const formatAmount = (value) =>
  value.toLocaleString("en-US", { maximumFractionDigits: 2 });

const buildInputSnapshot = (financials = {}) => {
  const figure = (key) => financials[key] ?? 0;
  const availableCashFlow =
    figure("netMonthlyIncome") -
    figure("essentialExpenses") -
    figure("monthlyDebt") -
    figure("existingCommitments");
  const comfortable = figure("comfortableMonthlyAmount");

  return {
    netMonthlyIncome: figure("netMonthlyIncome"),
    essentialExpenses: figure("essentialExpenses"),
    monthlyDebt: figure("monthlyDebt"),
    existingCommitments: figure("existingCommitments"),
    comfortableMonthlyAmount: comfortable,
    currentSavings: figure("currentSavings"),
    emergencySavings: figure("emergencySavings"),
    availableCashFlow,
    // The Success Profile stores 0 for "not answered", so an unanswered
    // comfortable amount falls back to cash flow alone.
    safeCapacity:
      comfortable > 0 ? Math.min(comfortable, availableCashFlow) : availableCashFlow,
  };
};

/**
 * Overall status. Ordered rules — the first match wins; reorder or edit a
 * condition to tune. Uses only comparisons, no thresholds.
 */
const determineAffordabilityStatus = ({ options, snapshot, withinGoalRange }) => {
  // 1. Goal outside the program's configured range → can't activate as-is.
  if (!withinGoalRange) return STATUS.NOT_CURRENTLY_ELIGIBLE;
  // 2. The fastest plan fits the safe monthly capacity.
  if (options[0]?.affordable) return STATUS.ELIGIBLE;
  // 3. A slower plan fits → eligible on a longer timeline.
  if (options.some((option) => option.affordable))
    return STATUS.ELIGIBLE_WITH_ADJUSTMENT;
  // 4. No monthly room at all → income/expenses must change first.
  if (snapshot.availableCashFlow <= 0) return STATUS.INCREASE_INCOME_FIRST;
  // 5. Some room, but not enough for any plan → save toward it first.
  return STATUS.BUILD_SAVINGS_FIRST;
};

/** Text-only suggestions for the participant; none when fully eligible. */
const buildSuggestedAlternatives = ({
  status,
  options,
  snapshot,
  totalActivationRequirement,
  rules,
}) => {
  const suggestions = [];
  const capacity = formatAmount(Math.max(snapshot.safeCapacity, 0));

  if (status === STATUS.NOT_CURRENTLY_ELIGIBLE) {
    const range = [
      rules.minGoalAmount != null && `at least ${formatAmount(rules.minGoalAmount)}`,
      rules.maxGoalAmount != null && `at most ${formatAmount(rules.maxGoalAmount)}`,
    ].filter(Boolean);
    suggestions.push(
      `Adjust your goal amount for this program to ${range.join(" and ")}.`,
    );
  }

  if (status === STATUS.ELIGIBLE_WITH_ADJUSTMENT) {
    const fits = options.find((option) => option.affordable);
    suggestions.push(
      `Choose the ${fits.label} plan: ${fits.months} months at ${formatAmount(fits.scheduledPayment)} per month fits your budget.`,
    );
  }

  if (status === STATUS.BUILD_SAVINGS_FIRST) {
    suggestions.push(
      `Set aside about ${capacity} per month toward your activation before starting a plan.`,
      `Consider a lower-cost goal so the monthly payment fits within ${capacity} per month.`,
    );
  }

  if (status === STATUS.INCREASE_INCOME_FIRST) {
    suggestions.push(
      "Free up monthly cash flow by reducing essential expenses, debt payments, or other commitments.",
      "Look for ways to increase your monthly income.",
      "Consider a lower-cost goal once you have room in your monthly budget.",
    );
  }

  if (
    status !== STATUS.ELIGIBLE &&
    status !== STATUS.NOT_CURRENTLY_ELIGIBLE &&
    snapshot.currentSavings >= totalActivationRequirement
  ) {
    suggestions.push(
      `Your current savings could cover the full one-time activation of ${formatAmount(totalActivationRequirement)}.`,
    );
  }

  return suggestions;
};

/**
 * @param {object} input
 * @param {number} input.goalAmount
 * @param {object} input.financials  SuccessProfile.financials
 * @param {object} input.rules  plain values: activationPercentage,
 *   roundingIncrement, planMonthOptions, and optional percentageMin/Max,
 *   growthPeriodDays, minGoalAmount, maxGoalAmount
 */
export const calculateActivationPlan = ({ goalAmount, financials, rules }) => {
  const activationPercentage = clamp(
    rules.activationPercentage,
    rules.percentageMin,
    rules.percentageMax,
  );
  // Percent → fraction (unit conversion, not a business constant).
  const totalActivationRequirement = goalAmount * (activationPercentage / 100);
  const snapshot = buildInputSnapshot(financials);

  // One plan per configured month count, shortest = fastest. The label enum
  // caps how many paced plans we can name.
  const monthOptions = [...new Set(rules.planMonthOptions)]
    .sort((a, b) => a - b)
    .slice(0, PLAN_LABELS.length);

  const options = monthOptions.map((months, index) => {
    const scheduledPayment = roundUpToIncrement(
      totalActivationRequirement / months,
      rules.roundingIncrement,
    );
    return {
      label: PLAN_LABELS[index],
      months,
      scheduledPayment,
      totalActivationRequirement,
      activationPercentage,
      growthPeriodDays: rules.growthPeriodDays ?? null,
      totalGoal: goalAmount,
      affordable: scheduledPayment <= snapshot.safeCapacity,
    };
  });

  const withinGoalRange =
    (rules.minGoalAmount == null || goalAmount >= rules.minGoalAmount) &&
    (rules.maxGoalAmount == null || goalAmount <= rules.maxGoalAmount);

  const affordabilityStatus = determineAffordabilityStatus({
    options,
    snapshot,
    withinGoalRange,
  });

  return {
    goalAmount,
    activationPercentage,
    totalActivationRequirement,
    inputSnapshot: snapshot,
    options,
    oneTimeOption: { totalActivationRequirement, payFullNow: true },
    affordabilityStatus,
    suggestedAlternatives: buildSuggestedAlternatives({
      status: affordabilityStatus,
      options,
      snapshot,
      totalActivationRequirement,
      rules,
    }),
  };
};
