import { ENUMS, HTTP_STATUS } from "#/utils/constants.js";
import { AppError } from "#/utils/appError.js";
import { writeAuditLog } from "#/features/audit-logs/audit-log.service.js";
import User from "#/features/users/user.model.js";
import SuccessCenterSelection from "#/features/success-center-selections/success-center-selection.model.js";
import SuccessCenterProgram from "#/features/success-center-programs/success-center-program.model.js";
import SuccessCenterCategory from "#/features/success-center-categories/success-center-category.model.js";
import Recommendation from "./recommendation.model.js";
import {
  AFFORDABILITY_FIELD,
  buildEffective,
  finalPaymentOf,
  hasField,
  optionPath,
  sameValue,
  valueAt,
} from "./recommendation-effective.js";

/*
 * Admin oversight ON TOP of the computed recommendation: review, approve,
 * adjust (override) and reset. The calculation is never re-run or changed
 * here, and computed values are never overwritten — see
 * recommendation-effective.js. Every write is audit-logged.
 */

const REVIEW = ENUMS.RECOMMENDATION_REVIEW_STATUS;
const AUDIT = ENUMS.AUDIT_LOG_ACTION;
const TARGET = ENUMS.AUDIT_LOG_TARGET_TYPE.RECOMMENDATION;

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const SORT_FIELDS = {
  [ENUMS.RECOMMENDATION_SORT_BY.DATE]: "createdAt",
  [ENUMS.RECOMMENDATION_SORT_BY.NAME]: "participantName",
  [ENUMS.RECOMMENDATION_SORT_BY.REVIEW_STATUS]: "reviewStatus",
  [ENUMS.RECOMMENDATION_SORT_BY.AFFORDABILITY]: "affordabilityStatus",
};

// Records saved before review existed have no reviewStatus yet.
const REVIEW_STATUS_EXPR = { $ifNull: ["$reviewStatus", REVIEW.PENDING_REVIEW] };

// Effective affordability: an admin override wins over the computed status.
const AFFORDABILITY_EXPR = {
  $ifNull: [
    {
      $arrayElemAt: [
        {
          $map: {
            input: {
              $filter: {
                input: { $ifNull: ["$adminOverrides", []] },
                cond: { $eq: ["$$this.field", AFFORDABILITY_FIELD] },
              },
            },
            in: "$$this.value",
          },
        },
        0,
      ],
    },
    "$affordabilityStatus",
  ],
};

export const listForReview = async (query) => {
  const { page, limit, search, reviewStatus, affordabilityStatus, sortBy, sortOrder } =
    query;

  const pipeline = [
    {
      $addFields: {
        reviewStatus: REVIEW_STATUS_EXPR,
        affordabilityStatus: AFFORDABILITY_EXPR,
      },
    },
  ];
  if (reviewStatus) pipeline.push({ $match: { reviewStatus } });
  if (affordabilityStatus) pipeline.push({ $match: { affordabilityStatus } });

  // Joined before pagination: search and name sorting depend on it. Only
  // safe fields are projected.
  pipeline.push(
    {
      $lookup: {
        from: User.collection.name,
        let: { uid: "$userId" },
        pipeline: [
          { $match: { $expr: { $eq: ["$_id", "$$uid"] } } },
          { $project: { firstName: 1, lastName: 1, email: 1 } },
        ],
        as: "participant",
      },
    },
    { $unwind: { path: "$participant", preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        participantName: {
          $trim: {
            input: {
              $concat: [
                { $ifNull: ["$participant.firstName", ""] },
                " ",
                { $ifNull: ["$participant.lastName", ""] },
              ],
            },
          },
        },
      },
    },
  );
  if (search) {
    const pattern = { $regex: escapeRegex(search), $options: "i" };
    pipeline.push({
      $match: { $or: [{ participantName: pattern }, { "participant.email": pattern }] },
    });
  }

  const direction = sortOrder === ENUMS.SORT_ORDER.ASC ? 1 : -1;
  const sortField = SORT_FIELDS[sortBy] ?? "createdAt";
  pipeline.push({ $sort: { [sortField]: direction, _id: direction } });

  pipeline.push({
    $facet: {
      total: [{ $count: "count" }],
      rows: [
        { $skip: (page - 1) * limit },
        { $limit: limit },
        // Per-page joins: only for the rows actually returned.
        {
          $lookup: {
            from: SuccessCenterSelection.collection.name,
            localField: "selectionId",
            foreignField: "_id",
            pipeline: [{ $project: { programId: 1, categoryId: 1, status: 1 } }],
            as: "selection",
          },
        },
        { $unwind: { path: "$selection", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: SuccessCenterProgram.collection.name,
            localField: "selection.programId",
            foreignField: "_id",
            pipeline: [{ $project: { name: 1 } }],
            as: "program",
          },
        },
        {
          $lookup: {
            from: SuccessCenterCategory.collection.name,
            localField: "selection.categoryId",
            foreignField: "_id",
            pipeline: [{ $project: { name: 1 } }],
            as: "category",
          },
        },
        {
          $project: {
            selectionId: 1,
            participant: {
              _id: "$participant._id",
              name: "$participantName",
              email: "$participant.email",
            },
            programName: { $arrayElemAt: ["$program.name", 0] },
            categoryName: { $arrayElemAt: ["$category.name", 0] },
            selectionStatus: "$selection.status",
            affordabilityStatus: 1,
            reviewStatus: 1,
            adminAdjusted: { $ifNull: ["$adminAdjusted", false] },
            createdAt: 1,
            updatedAt: 1,
          },
        },
      ],
    },
  });

  const [result] = await Recommendation.aggregate(pipeline).collation({
    locale: "en",
    strength: 2, // case-insensitive name sorting
  });
  const total = result?.total[0]?.count ?? 0;

  return {
    success: true,
    message: "Recommendations retrieved successfully",
    data: {
      recommendations: result?.rows ?? [],
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    },
  };
};

const findRecommendation = async (id) => {
  const recommendation = await Recommendation.findById(id);
  if (!recommendation)
    throw new AppError("Recommendation not found", HTTP_STATUS.NOT_FOUND);
  return recommendation;
};

const ADMIN_USER_FIELDS = "firstName lastName email";

/** Everything an admin needs to review one recommendation. */
const buildDetail = async (id) => {
  const recommendation = await Recommendation.findById(id)
    .populate("userId", "firstName lastName email preferredCurrency")
    .populate({
      path: "selectionId",
      select:
        "programId categoryId obligationType goalAmount pricingSource verifiedQuoteAmount status activationStatus selectedAt",
      populate: [
        { path: "programId", select: "name programType goalNature" },
        { path: "categoryId", select: "name" },
      ],
    })
    .populate("approvedBy", ADMIN_USER_FIELDS)
    .populate("adminAdjustments.adjustedBy", ADMIN_USER_FIELDS)
    .lean();
  if (!recommendation)
    throw new AppError("Recommendation not found", HTTP_STATUS.NOT_FOUND);

  const {
    userId: user,
    selectionId: selection,
    adminOverrides = [],
    adminAdjustments = [],
    options,
    oneTimeOption,
    affordabilityStatus,
    projection,
    suggestedAlternatives,
    ...rest
  } = recommendation;

  return {
    ...rest,
    reviewStatus: rest.reviewStatus ?? REVIEW.PENDING_REVIEW,
    participant: user && {
      _id: user._id,
      name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
      email: user.email,
      preferredCurrency: user.preferredCurrency,
    },
    selection,
    // As calculated — never changed by an admin.
    computed: { options, oneTimeOption, affordabilityStatus, projection, suggestedAlternatives },
    // What the participant sees: computed + overrides.
    effective: buildEffective(recommendation, adminOverrides),
    // Original vs override, side by side.
    overrides: adminOverrides.map(({ field, value }) => ({
      field,
      originalValue: valueAt(recommendation, field),
      value,
    })),
    adjustments: [...adminAdjustments].reverse(), // newest first
  };
};

export const getReviewDetail = async (id) => ({
  success: true,
  message: "Recommendation retrieved successfully",
  data: await buildDetail(id),
});

export const approveRecommendation = async (id, admin) => {
  const recommendation = await findRecommendation(id);
  const before = recommendation.reviewStatus ?? REVIEW.PENDING_REVIEW;
  if (before === REVIEW.APPROVED)
    return {
      success: true,
      message: "Recommendation is already approved",
      data: await buildDetail(id),
    };

  recommendation.reviewStatus = REVIEW.APPROVED;
  recommendation.approvedBy = admin._id;
  recommendation.approvedAt = new Date();
  await recommendation.save();

  await writeAuditLog({
    actorId: admin._id,
    action: AUDIT.APPROVED_RECOMMENDATION,
    targetType: TARGET,
    targetId: recommendation._id,
    beforeValue: { reviewStatus: before },
    afterValue: {
      reviewStatus: REVIEW.APPROVED,
      approvedAt: recommendation.approvedAt,
      adminAdjusted: recommendation.adminAdjusted,
    },
  });

  return {
    success: true,
    message: "Recommendation approved",
    data: await buildDetail(id),
  };
};

/** Request body → [{ field, value }] in the field-path form overrides use. */
const flattenAdjustments = (body) => {
  const changes = [];
  if (body.affordabilityStatus !== undefined)
    changes.push({ field: AFFORDABILITY_FIELD, value: body.affordabilityStatus });

  const walk = (value, path) => {
    if (value === undefined) return;
    const isBranch =
      value !== null && typeof value === "object" && !(value instanceof Date);
    if (!isBranch) {
      changes.push({ field: path, value });
      return;
    }
    for (const [key, child] of Object.entries(value)) walk(child, `${path}.${key}`);
  };
  for (const [key, overrides] of Object.entries(body.options ?? {}))
    walk(overrides, optionPath(key));

  return changes;
};

const badRequest = (message) => new AppError(message, HTTP_STATUS.BAD_REQUEST);

/** Cross-field sanity on the effective result (single values are validated by zod). */
const assertConsistent = (effective) => {
  const check = (option, name) => {
    const projection = option?.projection;
    if (!projection) return;
    const range = projection.estimatedFundingRange;
    if (range?.earliest && range?.latest && new Date(range.earliest) > new Date(range.latest))
      throw badRequest(`${name}: the funding range's earliest date must be on or before its latest date.`);
    if (
      projection.growthPeriodCompletionDate &&
      projection.eligibilityDate &&
      new Date(projection.eligibilityDate) < new Date(projection.growthPeriodCompletionDate)
    )
      throw badRequest(`${name}: eligibility can't be before the growth period ends.`);
  };
  for (const option of effective.options) check(option, `${option.label} plan`);
  check(effective.oneTimeOption, "One-time option");

  // An adjusted monthly schedule must add up to the activation amount: the
  // payments cover it, and the last one isn't needed beyond it. (Only options
  // the admin changed — older stored plans may predate this rule.)
  const SCHEDULE_FIELDS = ["scheduledPayment", "months", "totalActivationRequirement"];
  for (const option of effective.options) {
    if (!option.adjustedFields?.some((field) => SCHEDULE_FIELDS.includes(field))) continue;
    const { scheduledPayment: payment, months, totalActivationRequirement: total } = option;
    if (payment == null || months == null || total == null) continue;
    if (payment * months < total)
      throw badRequest(
        `${option.label} plan: ${months} payments of ${payment} add up to ${payment * months}, less than the activation amount of ${total}. Raise the payment or the months.`,
      );
    if (finalPaymentOf(option) <= 0)
      throw badRequest(
        `${option.label} plan: ${months - 1} payments of ${payment} already cover the activation amount of ${total}. Lower the months to ${Math.ceil(total / payment)}.`,
      );
  }
};

export const adjustRecommendation = async (id, body, admin) => {
  const recommendation = await findRecommendation(id);
  const plain = recommendation.toObject();
  const currentOverrides = plain.adminOverrides ?? [];
  const currentEffective = buildEffective(plain, currentOverrides);

  const requested = flattenAdjustments(body);
  const unknown = requested.filter(({ field }) => !hasField(plain, field));
  if (unknown.length) {
    // Only a paced plan label can be missing (e.g. two configured month options).
    const plans = [...new Set(unknown.map(({ field }) => field.split(".")[1]))];
    throw badRequest(`This recommendation has no ${plans.join(", ")} plan to adjust.`);
  }

  // Only real changes against what's currently in effect.
  const changes = requested
    .map(({ field, value }) => ({
      field,
      value,
      previousValue: valueAt(currentEffective, field),
      originalValue: valueAt(plain, field),
    }))
    .filter(({ value, previousValue }) => !sameValue(value, previousValue));
  if (!changes.length)
    return {
      success: true,
      message: "No changes to apply",
      data: await buildDetail(id),
    };

  // Setting a field back to its computed value removes that override.
  const overrides = new Map(currentOverrides.map((item) => [item.field, item.value]));
  for (const { field, value, originalValue } of changes) {
    if (sameValue(value, originalValue)) overrides.delete(field);
    else overrides.set(field, value);
  }
  const nextOverrides = [...overrides].map(([field, value]) => ({ field, value }));
  assertConsistent(buildEffective(plain, nextOverrides));

  const before = {
    reviewStatus: plain.reviewStatus ?? REVIEW.PENDING_REVIEW,
    adminAdjusted: plain.adminAdjusted ?? false,
  };
  const adjustedAt = new Date();
  recommendation.adminOverrides = nextOverrides;
  recommendation.adminAdjusted = nextOverrides.length > 0;
  recommendation.reviewStatus = nextOverrides.length
    ? REVIEW.ADJUSTED
    : REVIEW.PENDING_REVIEW;
  // Any earlier approval covered different figures.
  recommendation.approvedBy = undefined;
  recommendation.approvedAt = undefined;
  recommendation.adjustmentReason = body.reason;
  recommendation.adminAdjustments.push(
    ...changes.map(({ field, value, previousValue, originalValue }) => ({
      field,
      originalValue,
      previousValue,
      newValue: value,
      reason: body.reason,
      adjustedBy: admin._id,
      adjustedAt,
    })),
  );
  await recommendation.save();

  await writeAuditLog({
    actorId: admin._id,
    action: AUDIT.ADJUSTED_RECOMMENDATION,
    targetType: TARGET,
    targetId: recommendation._id,
    beforeValue: {
      ...before,
      values: Object.fromEntries(changes.map((c) => [c.field, c.previousValue])),
    },
    afterValue: {
      reviewStatus: recommendation.reviewStatus,
      adminAdjusted: recommendation.adminAdjusted,
      values: Object.fromEntries(changes.map((c) => [c.field, c.value])),
      reason: body.reason,
    },
  });

  return {
    success: true,
    message: "Recommendation adjusted",
    data: await buildDetail(id),
  };
};

export const resetRecommendation = async (id, body, admin) => {
  const recommendation = await findRecommendation(id);
  const plain = recommendation.toObject();
  const currentOverrides = plain.adminOverrides ?? [];
  if (!currentOverrides.length)
    return {
      success: true,
      message: "No overrides to reset",
      data: await buildDetail(id),
    };

  const reason = body?.reason;
  const resetAt = new Date();
  const before = { reviewStatus: plain.reviewStatus ?? REVIEW.PENDING_REVIEW };

  recommendation.adminAdjustments.push(
    ...currentOverrides.map(({ field, value }) => ({
      field,
      originalValue: valueAt(plain, field),
      previousValue: value,
      newValue: valueAt(plain, field),
      reason,
      adjustedBy: admin._id,
      adjustedAt: resetAt,
    })),
  );
  recommendation.adminOverrides = [];
  recommendation.adminAdjusted = false;
  // The computed figures are back in effect and haven't been reviewed.
  recommendation.reviewStatus = REVIEW.PENDING_REVIEW;
  recommendation.approvedBy = undefined;
  recommendation.approvedAt = undefined;
  recommendation.adjustmentReason = undefined;
  await recommendation.save();

  await writeAuditLog({
    actorId: admin._id,
    action: AUDIT.RESET_RECOMMENDATION,
    targetType: TARGET,
    targetId: recommendation._id,
    beforeValue: {
      ...before,
      overrides: Object.fromEntries(currentOverrides.map((o) => [o.field, o.value])),
    },
    afterValue: { reviewStatus: REVIEW.PENDING_REVIEW, reason },
  });

  return {
    success: true,
    message: "Overrides reset to the computed values",
    data: await buildDetail(id),
  };
};
