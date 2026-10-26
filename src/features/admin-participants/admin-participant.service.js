import {
  ENUMS,
  FOUNDER_PLAN_DISPLAY_NAMES,
  HTTP_STATUS,
  PARTICIPANT_STANDING_LABELS,
} from "#/utils/constants.js";
import { AppError } from "#/utils/appError.js";
import { writeAuditLog } from "#/features/audit-logs/audit-log.service.js";
import User from "#/features/users/user.model.js";
import SuccessProfile from "#/features/success-profiles/success-profile.model.js";
import SuccessCenterSelection from "#/features/success-center-selections/success-center-selection.model.js";
import FounderPurchase from "#/features/founder-purchases/founder-purchase.model.js";
import { resolveSelectionAllowances } from "#/features/success-center-selections/success-center-selection.service.js";
import { listFundingAccessPlans } from "#/features/payments/payment-pricing.js";

// Never expose password or verification internals.
const SAFE_USER_FIELDS = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "country",
  "stateRegion",
  "preferredCurrency",
  "status",
  "foundingParticipant",
  "founderTier",
  "planningAccessStatus",
  "founderQualificationStatus",
  "permanentFounderNumber",
  "createdAt",
  "updatedAt",
];

// `lastActiveAt`: the User model has no activity timestamp yet, so updatedAt
// is the closest proxy. Swap both mappings below when one is added.
const SORT_FIELDS = {
  [ENUMS.PARTICIPANT_SORT_BY.NAME]: "name",
  [ENUMS.PARTICIPANT_SORT_BY.EMAIL]: "email",
  [ENUMS.PARTICIPANT_SORT_BY.STATUS]: "standing",
  [ENUMS.PARTICIPANT_SORT_BY.QUESTIONNAIRE]: "questionnaireComplete",
  [ENUMS.PARTICIPANT_SORT_BY.CREATED_AT]: "createdAt",
  [ENUMS.PARTICIPANT_SORT_BY.LAST_ACTIVE_AT]: "updatedAt",
};

/** A set founder tier wins; otherwise the founding flag; otherwise none. */
export const standingOf = (user) => {
  const tier = user.founderTier ?? ENUMS.FOUNDER_TIER.NONE;
  if (tier !== ENUMS.FOUNDER_TIER.NONE) return tier;
  return user.foundingParticipant
    ? ENUMS.PARTICIPANT_STANDING.FOUNDING_PARTICIPANT
    : ENUMS.PARTICIPANT_STANDING.NONE;
};

// Same rule as standingOf, as an aggregation expression.
const STANDING_EXPR = {
  $cond: [
    {
      $ne: [
        { $ifNull: ["$founderTier", ENUMS.FOUNDER_TIER.NONE] },
        ENUMS.FOUNDER_TIER.NONE,
      ],
    },
    "$founderTier",
    {
      $cond: [
        "$foundingParticipant",
        ENUMS.PARTICIPANT_STANDING.FOUNDING_PARTICIPANT,
        ENUMS.PARTICIPANT_STANDING.NONE,
      ],
    },
  ],
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Centers used vs allowed. The allowance is the SAME rule the selection check
 * enforces (every Funding Access + Founder purchase; null = no limit when an
 * admin granted planning access without a purchase; 0 = no access).
 */
const centersOf = (used, total) => ({
  centersUsed: used,
  centersTotal: total,
  centersSelected: `${used} / ${total ?? "no limit"}`,
});

/**
 * Filters + sort shared by the paginated list and the CSV export, so an
 * export always matches what the admin is viewing.
 */
const participantsPipeline = ({
  search,
  status,
  questionnaire,
  accountStatus,
  sortBy,
  sortOrder,
}) => {
  const pipeline = [
    {
      $match: {
        role: ENUMS.ROLES.USER,
        ...(accountStatus && { status: accountStatus }),
      },
    },
    {
      $addFields: {
        name: {
          $trim: {
            input: {
              $concat: [
                { $ifNull: ["$firstName", ""] },
                " ",
                { $ifNull: ["$lastName", ""] },
              ],
            },
          },
        },
        standing: STANDING_EXPR,
      },
    },
  ];

  if (search) {
    const pattern = { $regex: escapeRegex(search), $options: "i" };
    pipeline.push({ $match: { $or: [{ name: pattern }, { email: pattern }] } });
  }
  if (status) pipeline.push({ $match: { standing: status } });

  // Joined before pagination because the questionnaire filter depends on it.
  pipeline.push(
    {
      $lookup: {
        from: SuccessProfile.collection.name,
        let: { uid: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$userId", "$$uid"] } } },
          { $project: { status: 1, completionPercentage: 1 } },
        ],
        as: "profile",
      },
    },
    {
      $addFields: {
        questionnaireComplete: {
          $eq: [
            { $arrayElemAt: ["$profile.status", 0] },
            ENUMS.SUCCESS_PROFILE_STATUS.COMPLETE,
          ],
        },
      },
    },
  );
  if (questionnaire) {
    pipeline.push({
      $match: {
        questionnaireComplete:
          questionnaire === ENUMS.PARTICIPANT_QUESTIONNAIRE_FILTER.COMPLETE,
      },
    });
  }

  const direction = sortOrder === ENUMS.SORT_ORDER.ASC ? 1 : -1;
  const sortField = SORT_FIELDS[sortBy] ?? "updatedAt";
  pipeline.push({ $sort: { [sortField]: direction, _id: direction } });
  return pipeline;
};

// Per-row joins + output shape — run only for rows actually returned.
const PARTICIPANT_ROW_STAGES = [
  {
    $lookup: {
      from: SuccessCenterSelection.collection.name,
      let: { uid: "$_id" },
      pipeline: [
        {
          $match: {
            $expr: { $eq: ["$userId", "$$uid"] },
            status: ENUMS.SUCCESS_CENTER_SELECTION_STATUS.ACTIVE,
          },
        },
        { $count: "count" },
      ],
      as: "activeSelections",
    },
  },
  {
    $project: {
      name: 1,
      email: 1,
      country: 1,
      standing: 1,
      founderTier: 1,
      planningAccessStatus: 1,
      questionnaireComplete: 1,
      profileCompletion: { $arrayElemAt: ["$profile.completionPercentage", 0] },
      accountStatus: "$status",
      createdAt: 1,
      lastActiveAt: "$updatedAt",
      centersUsed: {
        $ifNull: [{ $arrayElemAt: ["$activeSelections.count", 0] }, 0],
      },
    },
  },
];

const PARTICIPANT_COLLATION = {
  locale: "en",
  strength: 2, // case-insensitive name/email sorting
};

const toParticipantRows = async (rows) => {
  const allowances = await resolveSelectionAllowances(rows);
  return rows.map(({ standing, centersUsed, ...row }) => ({
    ...row,
    status: standing,
    statusLabel: PARTICIPANT_STANDING_LABELS[standing],
    ...centersOf(centersUsed, allowances.get(String(row._id))),
  }));
};

/** Every participant matching the list filters (no paging) — for CSV export. */
export const findParticipantsForExport = async (filters) => {
  const rows = await User.aggregate([
    ...participantsPipeline(filters),
    ...PARTICIPANT_ROW_STAGES,
  ]).collation(PARTICIPANT_COLLATION);
  return toParticipantRows(rows);
};

export const listParticipants = async (query) => {
  const { page, limit } = query;

  const [result] = await User.aggregate([
    ...participantsPipeline(query),
    {
      $facet: {
        total: [{ $count: "count" }],
        rows: [{ $skip: (page - 1) * limit }, { $limit: limit }, ...PARTICIPANT_ROW_STAGES],
      },
    },
  ]).collation(PARTICIPANT_COLLATION);
  const total = result?.total[0]?.count ?? 0;
  const participants = await toParticipantRows(result?.rows ?? []);

  return {
    success: true,
    message: "Participants retrieved successfully",
    data: {
      participants,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  };
};

export const getParticipantById = async (userId) => {
  const user = await User.findOne({ _id: userId, role: ENUMS.ROLES.USER })
    .select(SAFE_USER_FIELDS.join(" "))
    .lean();
  if (!user) throw new AppError("Participant not found", HTTP_STATUS.NOT_FOUND);

  const [successProfile, selections, allowances, purchases, fundingPlans] = await Promise.all([
    SuccessProfile.findOne({ userId }).select("-__v").lean(),
    SuccessCenterSelection.find({
      userId,
      status: ENUMS.SUCCESS_CENTER_SELECTION_STATUS.ACTIVE,
    })
      .populate("programId", "name")
      .populate("categoryId", "name")
      .sort({ selectedAt: -1 })
      .select("-__v")
      .lean(),
    resolveSelectionAllowances([user]),
    FounderPurchase.find({ userId })
      .populate("planId", "name")
      .sort({ purchasedAt: -1 })
      .select("purpose fundingAccessPlanKey planId programAllowance activationStatus purchasedAt paymentId")
      .lean(),
    listFundingAccessPlans(),
  ]);
  const centers = centersOf(selections.length, allowances.get(String(user._id)));
  const fundingLabels = new Map(fundingPlans.map((plan) => [plan.key, plan.label]));

  const { status: accountStatus, updatedAt, ...safeUser } = user;
  const standing = standingOf(user);

  return {
    success: true,
    message: "Participant retrieved successfully",
    data: {
      participant: {
        ...safeUser,
        name: `${user.firstName} ${user.lastName}`.trim(),
        accountStatus,
        status: standing,
        statusLabel: PARTICIPANT_STANDING_LABELS[standing],
        lastActiveAt: updatedAt,
      },
      // null (not an error) when the participant hasn't started a profile.
      successProfile: successProfile ?? null,
      selections,
      centers: {
        used: centers.centersUsed,
        total: centers.centersTotal,
        label: centers.centersSelected,
      },
      // What the participant bought (Funding Access plans and Founder tiers).
      purchases: purchases.map((purchase) => ({
        _id: purchase._id,
        purpose: purchase.purpose,
        label:
          purchase.purpose === ENUMS.PAYMENT_PURPOSE.FUNDING_ACCESS
            ? (fundingLabels.get(purchase.fundingAccessPlanKey) ?? purchase.fundingAccessPlanKey)
            : (FOUNDER_PLAN_DISPLAY_NAMES[purchase.planId?.name] ?? purchase.planId?.name ?? null),
        programAllowance: purchase.programAllowance ?? null,
        activationStatus: purchase.activationStatus,
        purchasedAt: purchase.purchasedAt,
        paymentId: purchase.paymentId ?? null,
      })),
    },
  };
};

/* --- Admin access actions (each change is audited) --- */

const ACCESS_FIELDS = "status founderTier foundingParticipant planningAccessStatus";

const accessSummary = (user) => {
  const standing = standingOf(user);
  return {
    _id: user._id,
    accountStatus: user.status,
    status: standing,
    statusLabel: PARTICIPANT_STANDING_LABELS[standing],
    founderTier: user.founderTier,
    foundingParticipant: user.foundingParticipant,
    planningAccessStatus: user.planningAccessStatus,
  };
};

/** Applies `changes` to a participant and audits exactly what changed. */
const updateParticipant = async (userId, changes, admin, action, message) => {
  const before = await User.findOne({ _id: userId, role: ENUMS.ROLES.USER })
    .select(ACCESS_FIELDS)
    .lean();
  if (!before) throw new AppError("Participant not found", HTTP_STATUS.NOT_FOUND);

  const changed = Object.fromEntries(
    Object.entries(changes).filter(([field, value]) => before[field] !== value),
  );
  if (Object.keys(changed).length === 0) {
    return { success: true, message: "No changes to apply", data: accessSummary(before) };
  }

  // Only the touched paths are validated, so legacy fields cannot block this.
  const after = await User.findByIdAndUpdate(
    userId,
    { $set: changed },
    { new: true, runValidators: true },
  )
    .select(ACCESS_FIELDS)
    .lean();

  await writeAuditLog({
    actorId: admin._id,
    action,
    targetType: ENUMS.AUDIT_LOG_TARGET_TYPE.USER,
    targetId: userId,
    beforeValue: Object.fromEntries(Object.keys(changed).map((field) => [field, before[field]])),
    afterValue: changed,
  });

  return { success: true, message, data: accessSummary(after) };
};

// Suspended/closed take effect immediately: the login service and
// authenticate() (middleware/auth.middleware.js) refuse those accounts.
export const updateParticipantStatus = (userId, { status }, admin) =>
  updateParticipant(
    userId,
    { status },
    admin,
    ENUMS.AUDIT_LOG_ACTION.UPDATED_PARTICIPANT_STATUS,
    "Participant status updated",
  );

// TODO(founder-qualification): changing founderTier here does not assign a
// permanent founder number or run qualification - that service does not exist yet.
export const updateParticipantAccess = (userId, changes, admin) =>
  updateParticipant(
    userId,
    changes,
    admin,
    ENUMS.AUDIT_LOG_ACTION.UPDATED_PARTICIPANT_ACCESS,
    "Participant access updated",
  );
