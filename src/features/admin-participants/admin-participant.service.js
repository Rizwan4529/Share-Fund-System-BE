import {
  DEFAULT_SUCCESS_CENTER_LIMIT,
  ENUMS,
  HTTP_STATUS,
  PARTICIPANT_STANDING_LABELS,
} from "#/utils/constants.js";
import { AppError } from "#/utils/appError.js";
import { writeAuditLog } from "#/features/audit-logs/audit-log.service.js";
import User from "#/features/users/user.model.js";
import SuccessProfile from "#/features/success-profiles/success-profile.model.js";
import SuccessCenterSelection from "#/features/success-center-selections/success-center-selection.model.js";
import FounderPlan from "#/features/founder-plans/founder-plan.model.js";

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

const centersLabel = (used, total) => `${used} / ${total}`;

/** Allowed centers = the founder plan's included centers, matched by tier. */
const allowedCentersFor = async (founderTier) => {
  if (!founderTier || founderTier === ENUMS.FOUNDER_TIER.NONE)
    return DEFAULT_SUCCESS_CENTER_LIMIT;
  const plan = await FounderPlan.findOne({ name: founderTier })
    .select("includedSuccessCenters")
    .lean();
  return plan?.includedSuccessCenters?.length || DEFAULT_SUCCESS_CENTER_LIMIT;
};

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
    $lookup: {
      from: FounderPlan.collection.name,
      let: { tier: "$founderTier" },
      pipeline: [
        { $match: { $expr: { $eq: ["$name", "$$tier"] } } },
        {
          $project: {
            includedCount: {
              $size: { $ifNull: ["$includedSuccessCenters", []] },
            },
          },
        },
      ],
      as: "plan",
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
      planCenters: { $arrayElemAt: ["$plan.includedCount", 0] },
    },
  },
];

const PARTICIPANT_COLLATION = {
  locale: "en",
  strength: 2, // case-insensitive name/email sorting
};

const toParticipantRow = ({ standing, planCenters, centersUsed, ...row }) => {
  const centersTotal = planCenters || DEFAULT_SUCCESS_CENTER_LIMIT;
  return {
    ...row,
    status: standing,
    statusLabel: PARTICIPANT_STANDING_LABELS[standing],
    centersUsed,
    centersTotal,
    centersSelected: centersLabel(centersUsed, centersTotal),
  };
};

/** Every participant matching the list filters (no paging) — for CSV export. */
export const findParticipantsForExport = async (filters) => {
  const rows = await User.aggregate([
    ...participantsPipeline(filters),
    ...PARTICIPANT_ROW_STAGES,
  ]).collation(PARTICIPANT_COLLATION);
  return rows.map(toParticipantRow);
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
  const participants = (result?.rows ?? []).map(toParticipantRow);

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

  const [successProfile, selections, centersTotal] = await Promise.all([
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
    allowedCentersFor(user.founderTier),
  ]);

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
        used: selections.length,
        total: centersTotal,
        label: centersLabel(selections.length, centersTotal),
      },
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

// TODO(auth): suspended/closed are recorded here but NOT yet enforced -
// nothing checks User.status today. Enforcement belongs in
// middleware/auth.middleware.js (authenticate) and the login service.
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
