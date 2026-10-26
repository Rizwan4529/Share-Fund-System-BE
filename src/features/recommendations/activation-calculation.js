import { ENUMS } from "#/utils/constants.js";
import { calculateProjections } from "./projection-calculation.js";

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

// Currency rounding to cents (unit conversion, not a business value).
const toCents = (value) => Math.round(value * 100) / 100;

const buildInputSnapshot = (financials = {}) => {
  const figure = (key) => financials[key] ?? 0;
  const availableCashFlow =
    figure("netMonthlyIncome") -
    figure("essentialExpenses") -
    figure("monthlyDebt") -
    figure("existingCommitments");
  // 0 is a real answer ("nothing comfortable"); only an unanswered amount
  // (null) falls back to cash flow alone.
  const comfortable = financials.comfortableMonthlyAmount ?? null;

  return {
    netMonthlyIncome: figure("netMonthlyIncome"),
    essentialExpenses: figure("essentialExpenses"),
    monthlyDebt: figure("monthlyDebt"),
    existingCommitments: figure("existingCommitments"),
    comfortableMonthlyAmount: comfortable,
    currentSavings: figure("currentSavings"),
    emergencySavings: figure("emergencySavings"),
    availableCashFlow,
    safeCapacity:
      comfortable == null ? availableCashFlow : Math.min(comfortable, availableCashFlow),
  };
};

/**
 * Monthly schedule for one plan term. The regular payment is the requirement
 * spread over the term, rounded UP to the increment; payments stop once the
 * requirement is covered, so the last one may be smaller and the schedule may
 * be shorter than the term. The total collected always equals the requirement.
 */
export const buildSchedule = (totalActivationRequirement, termMonths, increment) => {
  const scheduledPayment = roundUpToIncrement(
    totalActivationRequirement / termMonths,
    increment,
  );
  const months = Math.min(
    termMonths,
    Math.ceil(Number((totalActivationRequirement / scheduledPayment).toPrecision(12))),
  );
  const finalPayment = toCents(totalActivationRequirement - scheduledPayment * (months - 1));
  return { scheduledPayment, months, finalPayment };
};

/** One-time activation is paid in full from current savings (not emergency savings). */
export const isOneTimeAffordable = (snapshot, totalActivationRequirement) =>
  (snapshot?.currentSavings ?? 0) >= totalActivationRequirement;

/**
 * Overall status. Ordered rules — the first match wins; reorder or edit a
 * condition to tune. Uses only comparisons, no thresholds.
 */
const determineAffordabilityStatus = ({
  options,
  snapshot,
  withinGoalRange,
  oneTimeAffordable,
}) => {
  // 1. Goal outside the program's configured range → can't activate as-is.
  if (!withinGoalRange) return STATUS.NOT_CURRENTLY_ELIGIBLE;
  // 2. The fastest plan fits the safe monthly capacity.
  if (options[0]?.affordable) return STATUS.ELIGIBLE;
  // 3. A slower plan fits → eligible on a longer timeline.
  if (options.some((option) => option.affordable))
    return STATUS.ELIGIBLE_WITH_ADJUSTMENT;
  // 4. No monthly room at all → income/expenses must change first.
  if (snapshot.availableCashFlow <= 0) return STATUS.INCREASE_INCOME_FIRST;
  // 5. Current savings cover the full one-time activation → eligible that way.
  if (oneTimeAffordable) return STATUS.ELIGIBLE_WITH_ADJUSTMENT;
  // 6. Some room, but not enough for any plan → save toward it first.
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
      fits
        ? `Choose the ${fits.label} plan: ${fits.months} months at ${formatAmount(fits.scheduledPayment)} per month fits your budget.`
        : `Pay the full one-time activation of ${formatAmount(totalActivationRequirement)} from your current savings. The monthly plans are above your comfortable monthly amount.`,
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

  return suggestions;
};

/**
 * @param {object} input
 * @param {number} input.goalAmount
 * @param {object} input.financials  SuccessProfile.financials
 * @param {object} input.rules  plain values: activationPercentage,
 *   roundingIncrement, planMonthOptions, and optional percentageMin/Max,
 *   minGoalAmount, maxGoalAmount, plus the projection rules
 *   (growthPeriodDays, eligibilityOffsetDays, fundingStartOffsetDays,
 *   fundingRangeDays)
 * @param {object} input.projectionContext  { goalNature, basisDate, basis }
 *   — see projection-calculation.js
 */
export const calculateActivationPlan = ({
  goalAmount,
  financials,
  rules,
  projectionContext,
}) => {
  const activationPercentage = clamp(
    rules.activationPercentage,
    rules.percentageMin,
    rules.percentageMax,
  );
  // Percent → fraction (unit conversion, not a business constant).
  const totalActivationRequirement = toCents(goalAmount * (activationPercentage / 100));
  const snapshot = buildInputSnapshot(financials);

  // One plan per configured month count, shortest = fastest. The label enum
  // caps how many paced plans we can name.
  const monthOptions = [...new Set(rules.planMonthOptions)]
    .sort((a, b) => a - b)
    .slice(0, PLAN_LABELS.length);

  const pacedOptions = [];
  monthOptions.forEach((termMonths, index) => {
    const schedule = buildSchedule(
      totalActivationRequirement,
      termMonths,
      rules.roundingIncrement,
    );
    // Small requirements can give several terms the same schedule; keep one.
    const duplicate = pacedOptions.some(
      (option) =>
        option.months === schedule.months &&
        option.scheduledPayment === schedule.scheduledPayment,
    );
    if (duplicate) return;
    pacedOptions.push({
      label: PLAN_LABELS[index],
      planTermMonths: termMonths,
      ...schedule,
      totalActivationRequirement,
      activationPercentage,
      growthPeriodDays: rules.growthPeriodDays ?? null,
      totalGoal: goalAmount,
      affordable: schedule.scheduledPayment <= snapshot.safeCapacity,
    });
  });

  // Timeline + funding range estimates, in the same pass as the figures.
  const { projection, optionProjections, oneTimeProjection } =
    calculateProjections({ options: pacedOptions, rules, ...projectionContext });
  const options = pacedOptions.map((option, index) => ({
    ...option,
    projection: optionProjections[index],
  }));

  const withinGoalRange =
    (rules.minGoalAmount == null || goalAmount >= rules.minGoalAmount) &&
    (rules.maxGoalAmount == null || goalAmount <= rules.maxGoalAmount);

  const oneTimeAffordable = isOneTimeAffordable(snapshot, totalActivationRequirement);
  const affordabilityStatus = determineAffordabilityStatus({
    options,
    snapshot,
    withinGoalRange,
    oneTimeAffordable,
  });

  return {
    goalAmount,
    activationPercentage,
    totalActivationRequirement,
    inputSnapshot: snapshot,
    options,
    oneTimeOption: {
      totalActivationRequirement,
      payFullNow: true,
      affordable: oneTimeAffordable,
      projection: oneTimeProjection,
    },
    projection,
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
