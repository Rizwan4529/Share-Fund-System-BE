import { z } from "zod";
import { ENUMS, HTTP_STATUS, SETTING_KEYS } from "#/utils/constants.js";
import { AppError } from "#/utils/appError.js";

/*
 * What a valid value looks like for each known setting. The data type check
 * alone let through values like -5% or a rounding increment of 0, which then
 * broke calculations, so every setting the platform reads is checked here.
 * Settings without an entry fall back to a check by data type.
 */

const percent = (label) =>
  z
    .number({ error: `${label} must be a number` })
    .min(0, `${label} can't be negative`)
    .max(100, `${label} can't be more than 100%`);

const positivePercent = (label) =>
  percent(label).refine((value) => value > 0, `${label} must be more than 0%`);

const positiveNumber = (label) =>
  z.number({ error: `${label} must be a number` }).positive(`${label} must be more than 0`);

const nonNegativeNumber = (label) =>
  z.number({ error: `${label} must be a number` }).min(0, `${label} can't be negative`);

const dayCount = (label) =>
  z
    .number({ error: `${label} must be a number` })
    .int(`${label} must be a whole number of days`)
    .min(0, `${label} can't be negative`);

const percentRange = (label) =>
  z
    .object({ min: percent(`${label} minimum`), max: percent(`${label} maximum`) }, {
      error: `${label} must be an object like { "min": 10, "max": 25 }`,
    })
    .strict()
    .refine((range) => range.min <= range.max, `${label} minimum can't be above its maximum`);

const monthOptions = z
  .array(
    z
      .number({ error: "Each month option must be a number" })
      .int("Each month option must be a whole number")
      .positive("Each month option must be at least 1"),
    { error: "Plan month options must be a list of numbers" },
  )
  .min(1, "Add at least one month option")
  // One per plan: Fast, Moderate, Longer.
  .max(3, "Use at most three month options (Fast, Moderate and Longer)")
  .refine(
    (months) => months.every((value, index) => index === 0 || value > months[index - 1]),
    "List month options shortest first, without repeats (for example [6, 12, 24])",
  );

const fundingAccessPlan = z
  .object({
    key: z
      .string({ error: "Each plan needs a key" })
      .trim()
      .regex(/^[a-z0-9_]+$/, "Plan keys use lowercase letters, numbers and underscores only"),
    label: z.string({ error: "Each plan needs a label" }).trim().min(1, "Each plan needs a label"),
    price: positiveNumber("Plan price"),
    programAllowance: z
      .number({ error: "Programs included must be a number" })
      .int("Programs included must be a whole number")
      .min(1, "A plan must include at least 1 program"),
    active: z.boolean({ error: "Availability must be true or false" }).optional(),
  })
  .strict();

const fundingAccessPlans = z
  .array(fundingAccessPlan, { error: "Funding Access plans must be a list" })
  .min(1, "Keep at least one Funding Access plan (mark it inactive to stop selling it)")
  .refine(
    (plans) => new Set(plans.map((plan) => plan.key)).size === plans.length,
    "Each Funding Access plan needs a different key",
  );

const currency = z
  .object({
    code: z
      .string({ error: "Currency code is required" })
      .regex(/^[A-Za-z]{3}$/, "Currency code must be a 3-letter ISO code such as USD"),
  })
  .strict();

const VALUE_SCHEMAS = {
  [SETTING_KEYS.ACTIVATION_DEFAULT_PERCENTAGE]: positivePercent("Default activation percentage"),
  [SETTING_KEYS.ACTIVATION_PERCENTAGE_MIN]: percent("Minimum activation percentage"),
  [SETTING_KEYS.ACTIVATION_PERCENTAGE_MAX]: positivePercent("Maximum activation percentage"),
  [SETTING_KEYS.ACTIVATION_ROUNDING_INCREMENT]: positiveNumber("Rounding increment"),
  [SETTING_KEYS.ACTIVATION_PLAN_MONTH_OPTIONS]: monthOptions,
  [SETTING_KEYS.ACTIVATION_MIN_GOAL_AMOUNT]: nonNegativeNumber("Minimum goal amount"),
  [SETTING_KEYS.ACTIVATION_MAX_GOAL_AMOUNT]: positiveNumber("Maximum goal amount"),
  [SETTING_KEYS.GROWTH_PERIOD_DEFAULT_DAYS]: dayCount("Growth period"),
  [SETTING_KEYS.GROWTH_PERIOD_ELIGIBILITY_OFFSET_DAYS]: dayCount("Eligibility offset"),
  [SETTING_KEYS.PROJECTION_FUNDING_START_OFFSET_DAYS]: dayCount("Funding start offset"),
  [SETTING_KEYS.PROJECTION_FUNDING_RANGE_DAYS]: dayCount("Funding range"),
  [SETTING_KEYS.PRICING_FUNDING_ACCESS_PLANS]: fundingAccessPlans,
  [SETTING_KEYS.PRICING_CURRENCY]: currency,
  [SETTING_KEYS.PLATFORM_FEE_PERCENTAGE]: percent("Platform fee"),
  [SETTING_KEYS.THRESHOLD_BASELINE_PERCENTAGE]: percent("Threshold baseline"),
  [SETTING_KEYS.RESERVE_PARTICIPATION_MIN]: percent("Minimum reserve participation"),
  [SETTING_KEYS.RESERVE_PARTICIPATION_MAX]: percent("Maximum reserve participation"),
  [SETTING_KEYS.ACTIVATION_RECURRING_PERCENTAGE_RANGE]: percentRange("Recurring activation range"),
  [SETTING_KEYS.ACTIVATION_ONE_TIME_PERCENTAGE_RANGE]: percentRange("One-time activation range"),
};

// Min/max pairs stored as separate settings: the pair must stay in order.
const BOUND_PAIRS = [
  [SETTING_KEYS.ACTIVATION_PERCENTAGE_MIN, SETTING_KEYS.ACTIVATION_PERCENTAGE_MAX],
  [SETTING_KEYS.ACTIVATION_MIN_GOAL_AMOUNT, SETTING_KEYS.ACTIVATION_MAX_GOAL_AMOUNT],
  [SETTING_KEYS.RESERVE_PARTICIPATION_MIN, SETTING_KEYS.RESERVE_PARTICIPATION_MAX],
];

const BY_DATA_TYPE = {
  [ENUMS.SETTINGS_DATA_TYPE.PERCENTAGE]: percent("Percentage"),
  [ENUMS.SETTINGS_DATA_TYPE.NUMBER]: z
    .number({ error: "Value must be a number" })
    .refine(Number.isFinite, "Value must be a finite number"),
};

const invalid = (message) =>
  new AppError(message, HTTP_STATUS.BAD_REQUEST, [{ field: "value", message }]);

/** Throws a 400 with a plain-language message when the value isn't usable. */
export const assertSettingValueValid = (key, dataType, value) => {
  const schema = VALUE_SCHEMAS[key] ?? BY_DATA_TYPE[dataType];
  if (!schema) return;
  const result = schema.safeParse(value);
  if (!result.success) throw invalid(result.error.issues[0]?.message ?? "Value is invalid");
};

/**
 * For a key that is one half of a min/max pair, checks the new value against
 * the other half's current value. `readValue(key)` returns that value or undefined.
 */
export const assertBoundPairInOrder = async (key, value, readValue) => {
  for (const [minKey, maxKey] of BOUND_PAIRS) {
    if (key !== minKey && key !== maxKey) continue;
    const other = await readValue(key === minKey ? maxKey : minKey);
    if (typeof other !== "number") return;
    const [min, max] = key === minKey ? [value, other] : [other, value];
    if (min > max)
      throw invalid(
        key === minKey
          ? `This minimum can't be above the current maximum (${other}) in '${maxKey}'`
          : `This maximum can't be below the current minimum (${other}) in '${minKey}'`,
      );
  }
};
