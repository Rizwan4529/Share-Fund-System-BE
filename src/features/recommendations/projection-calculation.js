import { ENUMS, PROJECTION_NOTICE } from "#/utils/constants.js";

/*
 * Projection calculation — PURE: no DB, no settings reads, no clock reads.
 * Every day count arrives through `rules` (resolved from program
 * activationRules → settings by activation-rules.js) and "now" arrives as
 * `basisDate`, so the same inputs always give the same dates.
 *
 * Everything here is a PROJECTION for planning. Phase 1 moves no money, so
 * nothing produced here is a promise of funding or timing; every result is
 * flagged `isProjection: true`. The advanced BMIS engine will replace parts of
 * this later — each step below is commented so it's easy to tune.
 *
 * Timeline model (per option):
 *   1. Growth period starts on the basis date (the activation payment date
 *      once paid, otherwise the date the plan is calculated).
 *   2. Growth period completes `growthPeriodDays` later.
 *   3. Eligibility begins `eligibilityOffsetDays` after completion
 *      (e.g. 45 + 1 → "Day 46").
 *   4. Activation completes when the last scheduled payment is made:
 *      basis + the option's months (the one-time option completes on the
 *      basis date).
 *   5. Estimated funding range is counted from an anchor date:
 *      - recurring programs: the eligibility date (monthly support can begin
 *        once eligible, while scheduled payments continue);
 *      - one-time programs: whichever is later, eligibility or activation
 *        completion (a one-time goal is supported only once its full
 *        activation is met).
 *      earliest = anchor + fundingStartOffsetDays
 *      latest   = earliest + fundingRangeDays
 */

const STATUS = ENUMS.PROJECTION_STATUS;
const ANCHOR = ENUMS.PROJECTION_FUNDING_ANCHOR;

/** The rules a projection needs; all must be configured to project. */
export const PROJECTION_RULE_NAMES = [
  "growthPeriodDays",
  "eligibilityOffsetDays",
  "fundingStartOffsetDays",
  "fundingRangeDays",
];

// Unit conversion only (days → ms), not a business value.
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const addDays = (date, days) => new Date(date.getTime() + days * MS_PER_DAY);

/** Calendar months in UTC, clamped to month end (Jan 31 + 1 → Feb 28/29). */
const addMonths = (date, months) => {
  const result = new Date(date.getTime());
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
};

const laterOf = (a, b) => (a.getTime() >= b.getTime() ? a : b);

/** Step 5: where the funding range is counted from (see header). */
const resolveFundingAnchor = ({ goalNature, eligibilityDate, activationCompletionDate }) => {
  if (goalNature === ENUMS.SUCCESS_CENTER_GOAL_NATURE.RECURING)
    return { anchor: ANCHOR.ELIGIBILITY_DATE, date: eligibilityDate };
  const date = laterOf(eligibilityDate, activationCompletionDate);
  return {
    anchor:
      date === eligibilityDate
        ? ANCHOR.ELIGIBILITY_DATE
        : ANCHOR.ACTIVATION_COMPLETION_DATE,
    date,
  };
};

/** Projection for one option; `months` is 0 for the one-time option. */
const projectOption = ({ months, rules, basisDate, goalNature }) => {
  const growthPeriodStartDate = basisDate; // step 1
  const growthPeriodCompletionDate = addDays(
    growthPeriodStartDate,
    rules.growthPeriodDays,
  ); // step 2
  const eligibilityDate = addDays(
    growthPeriodCompletionDate,
    rules.eligibilityOffsetDays,
  ); // step 3
  const activationCompletionDate = addMonths(basisDate, months); // step 4

  const { anchor, date: anchorDate } = resolveFundingAnchor({
    goalNature,
    eligibilityDate,
    activationCompletionDate,
  }); // step 5
  const earliest = addDays(anchorDate, rules.fundingStartOffsetDays);
  const latest = addDays(earliest, rules.fundingRangeDays);

  return {
    isProjection: true,
    status: STATUS.PROJECTED,
    growthPeriodStartDate,
    growthPeriodCompletionDate,
    eligibilityDate,
    activationMonths: months,
    activationCompletionDate,
    estimatedFundingRange: {
      earliest,
      latest,
      basis: STATUS.PROJECTED,
      anchor,
    },
  };
};

/**
 * @param {object} input
 * @param {Array<{ months: number }>} input.options  paced plan options
 * @param {object} input.rules  plain resolved rule values
 * @param {string} input.goalNature  program goalNature (one_time | recurring)
 * @param {Date} input.basisDate  growth period start (see header, step 1)
 * @param {string} input.basis  ENUMS.PROJECTION_BASIS value
 * @returns {{ projection, optionProjections, oneTimeProjection }}
 */
export const calculateProjections = ({
  options,
  rules,
  goalNature,
  basisDate,
  basis,
}) => {
  const missingRules = PROJECTION_RULE_NAMES.filter((name) => rules[name] == null);
  const configured = missingRules.length === 0;

  const projection = {
    isProjection: true,
    status: configured ? STATUS.PROJECTED : STATUS.NOT_CONFIGURED,
    notice: PROJECTION_NOTICE,
    basis,
    basisDate,
    goalNature,
    missingRules,
  };

  if (!configured) {
    const unavailable = { isProjection: true, status: STATUS.NOT_CONFIGURED };
    return {
      projection,
      optionProjections: options.map(() => unavailable),
      oneTimeProjection: unavailable,
    };
  }

  return {
    projection,
    optionProjections: options.map((option) =>
      projectOption({ months: option.months, rules, basisDate, goalNature }),
    ),
    // Paid in full on the basis date, so activation completes immediately.
    oneTimeProjection: projectOption({ months: 0, rules, basisDate, goalNature }),
  };
};
