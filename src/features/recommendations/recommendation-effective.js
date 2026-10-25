import { ENUMS, RECOMMENDATION_ONE_TIME_KEY } from "#/utils/constants.js";

/*
 * "Effective" recommendation = the computed result with admin overrides
 * applied on top. The computed fields on the document are never changed by
 * an admin; overrides are stored separately as { field, value } and applied
 * here on read, so the original is always recoverable.
 *
 * Field paths:
 *   affordabilityStatus
 *   options.<fast|moderate|longer>.<totalActivationRequirement|scheduledPayment|months>
 *   options.<label>.projection.<growthPeriodCompletionDate|eligibilityDate|activationCompletionDate>
 *   options.<label>.projection.estimatedFundingRange.<earliest|latest>
 *   oneTimeOption.<totalActivationRequirement | projection.…>
 */

export const AFFORDABILITY_FIELD = "affordabilityStatus";
const ONE_TIME_PATH = "oneTimeOption";

/** "options.fast" / "oneTimeOption" — the path prefix for an option key. */
export const optionPath = (key) =>
  key === RECOMMENDATION_ONE_TIME_KEY ? ONE_TIME_PATH : `options.${key}`;

const toPlain = (doc) => (typeof doc?.toObject === "function" ? doc.toObject() : doc);

/** Copies an option deep enough that overrides never touch the source. */
const cloneOption = (option) => {
  if (!option) return option;
  const projection = option.projection
    ? {
        ...option.projection,
        estimatedFundingRange: option.projection.estimatedFundingRange
          ? { ...option.projection.estimatedFundingRange }
          : undefined,
      }
    : undefined;
  return { ...option, projection };
};

/**
 * Splits a field path into the option it targets and the remaining path.
 * Returns null for a path this recommendation doesn't have (e.g. a paced plan
 * label that wasn't produced).
 */
const locate = (rec, field) => {
  const parts = field.split(".");
  if (field === AFFORDABILITY_FIELD) return { kind: "plan", rest: [] };
  if (parts[0] === ONE_TIME_PATH)
    return { kind: "option", option: rec.oneTimeOption, rest: parts.slice(1) };
  if (parts[0] === "options") {
    const option = rec.options?.find((item) => item.label === parts[1]);
    return option ? { kind: "option", option, rest: parts.slice(2) } : null;
  }
  return null;
};

const readPath = (obj, parts) =>
  parts.reduce((value, key) => (value == null ? undefined : value[key]), obj);

const writePath = (obj, parts, value) => {
  let target = obj;
  for (const key of parts.slice(0, -1)) {
    target[key] ??= {};
    target = target[key];
  }
  target[parts.at(-1)] = value;
};

/** True when the recommendation has a target for this field path. */
export const hasField = (rec, field) => locate(toPlain(rec), field) !== null;

/** The value at a field path (computed, or effective when given one). */
export const valueAt = (rec, field) => {
  const plain = toPlain(rec);
  const target = locate(plain, field);
  if (!target) return undefined;
  if (target.kind === "plan") return plain.affordabilityStatus;
  return readPath(target.option, target.rest);
};

/** Dates compare by time; everything else strictly. */
export const sameValue = (a, b) => {
  const time = (value) => (value instanceof Date ? value.getTime() : value);
  return time(a) === time(b);
};

/**
 * Computed result + overrides → { affordabilityStatus, options, oneTimeOption }.
 * Overridden options list their changed paths in `adjustedFields`.
 */
export const buildEffective = (rec, overrides = toPlain(rec)?.adminOverrides) => {
  const plain = toPlain(rec);
  const effective = {
    affordabilityStatus: plain.affordabilityStatus,
    options: (plain.options ?? []).map(cloneOption),
    oneTimeOption: cloneOption(plain.oneTimeOption),
  };

  for (const { field, value } of overrides ?? []) {
    const target = locate(effective, field);
    if (!target) continue;
    if (target.kind === "plan") {
      effective.affordabilityStatus = value;
      continue;
    }
    writePath(target.option, target.rest, value);
    (target.option.adjustedFields ??= []).push(target.rest.join("."));
    // An admin-entered date is still an estimate: keep the projection label,
    // and treat it as projected even if the computed one wasn't configured.
    if (target.rest[0] === "projection") {
      target.option.projection.isProjection = true;
      target.option.projection.status = ENUMS.PROJECTION_STATUS.PROJECTED;
    }
  }

  return effective;
};

// Admin-only fields participants never see.
const ADMIN_ONLY_FIELDS = [
  "adminOverrides",
  "adminAdjustments",
  "adjustmentReason",
  "approvedBy",
];

/**
 * What participants (and payment pricing) see: effective figures, projection
 * labels kept, admin internals removed.
 */
export const toParticipantView = (rec) => {
  const plain = toPlain(rec);
  const view = { ...plain, ...buildEffective(plain) };
  for (const field of ADMIN_ONLY_FIELDS) delete view[field];
  view.reviewStatus ??= ENUMS.RECOMMENDATION_REVIEW_STATUS.PENDING_REVIEW;
  return view;
};
