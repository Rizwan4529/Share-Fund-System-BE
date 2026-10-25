import { HTTP_STATUS, SETTING_KEYS } from "#/utils/constants.js";
import { AppError } from "#/utils/appError.js";
import { getSettingsByKeys } from "#/features/settings/setting.service.js";

const isPositiveNumber = (value) => typeof value === "number" && value > 0;
const isNonNegativeNumber = (value) => typeof value === "number" && value >= 0;
const isMonthList = (value) =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every((months) => Number.isInteger(months) && months > 0);

/**
 * Every rule the activation calculation uses. `programField` is the key on
 * SuccessCenterProgram.activationRules (checked first); `settingKey` is the
 * global fallback in the settings collection. No values live here — only
 * where to read them from and what a valid value looks like.
 */
const RULE_DEFINITIONS = [
  {
    name: "activationPercentage",
    programField: "defaultActivationPercentage",
    settingKey: SETTING_KEYS.ACTIVATION_DEFAULT_PERCENTAGE,
    required: true,
    isValid: isPositiveNumber,
  },
  {
    name: "percentageMin",
    programField: "activationPercentageMin",
    settingKey: SETTING_KEYS.ACTIVATION_PERCENTAGE_MIN,
    required: false,
    isValid: isNonNegativeNumber,
  },
  {
    name: "percentageMax",
    programField: "activationPercentageMax",
    settingKey: SETTING_KEYS.ACTIVATION_PERCENTAGE_MAX,
    required: false,
    isValid: isPositiveNumber,
  },
  {
    name: "roundingIncrement",
    programField: "roundingIncrement",
    settingKey: SETTING_KEYS.ACTIVATION_ROUNDING_INCREMENT,
    required: true,
    isValid: isPositiveNumber,
  },
  {
    // Programs have no per-program month list yet, so this is settings-only.
    name: "planMonthOptions",
    programField: null,
    settingKey: SETTING_KEYS.ACTIVATION_PLAN_MONTH_OPTIONS,
    required: true,
    isValid: isMonthList,
  },
  {
    name: "growthPeriodDays",
    programField: "growthPeriodDays",
    settingKey: SETTING_KEYS.GROWTH_PERIOD_DEFAULT_DAYS,
    required: false, // informational on each option; not used in the math
    isValid: isNonNegativeNumber,
  },
  {
    name: "minGoalAmount",
    programField: "minGoalAmount",
    settingKey: SETTING_KEYS.ACTIVATION_MIN_GOAL_AMOUNT,
    required: false,
    isValid: isNonNegativeNumber,
  },
  {
    name: "maxGoalAmount",
    programField: "maxGoalAmount",
    settingKey: SETTING_KEYS.ACTIVATION_MAX_GOAL_AMOUNT,
    required: false,
    isValid: isPositiveNumber,
  },
];

/**
 * Resolves each rule for a program: the program's own activationRules value
 * if set, otherwise the settings value. Returns the resolved rules (value +
 * source) and the exact settings versions used, for the snapshot.
 */
export const resolveActivationRules = async (program) => {
  const settings = await getSettingsByKeys(
    RULE_DEFINITIONS.map((rule) => rule.settingKey),
  );

  const resolved = {};
  const settingsUsed = [];
  const missing = [];
  const invalid = [];

  for (const rule of RULE_DEFINITIONS) {
    const programValue = rule.programField
      ? program.activationRules?.[rule.programField]
      : null;
    const setting = settings.get(rule.settingKey);

    let entry = null;
    if (programValue != null) {
      entry = { value: programValue, source: "program" };
    } else if (setting) {
      entry = { value: setting.value, source: "setting" };
      settingsUsed.push({
        key: setting.key,
        settingId: setting._id,
        value: setting.value,
        version: (setting.versionHistory?.length ?? 0) + 1,
        updatedAt: setting.updatedAt,
      });
    }

    if (!entry) {
      if (rule.required) missing.push(rule.settingKey);
      continue;
    }
    if (!rule.isValid(entry.value)) {
      invalid.push(
        entry.source === "program"
          ? `program activationRules.${rule.programField}`
          : rule.settingKey,
      );
      continue;
    }
    resolved[rule.name] = entry;
  }

  if (missing.length || invalid.length) {
    const problems = [
      missing.length &&
        `not configured: ${missing.join(", ")} (set on the program or in settings)`,
      invalid.length && `invalid value: ${invalid.join(", ")}`,
    ].filter(Boolean);
    throw new AppError(
      `Activation rules are incomplete — ${problems.join("; ")}`,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
    );
  }

  return { resolved, settingsUsed };
};

/** { name: { value, source } } → { name: value } for the pure calculation. */
export const ruleValues = (resolved) =>
  Object.fromEntries(
    Object.entries(resolved).map(([name, entry]) => [name, entry.value]),
  );
