import { ENUMS, HTTP_STATUS } from "#/utils/constants.js";
import { AppError } from "#/utils/appError.js";
import { toChargeableAmount } from "#/config/stripe.js";
import User from "#/features/users/user.model.js";
import FounderPlan from "#/features/founder-plans/founder-plan.model.js";
import FounderPurchase from "#/features/founder-purchases/founder-purchase.model.js";
import SuccessCenterSelection from "#/features/success-center-selections/success-center-selection.model.js";
import SuccessCenterProgram from "#/features/success-center-programs/success-center-program.model.js";
import SuccessCenterCategory from "#/features/success-center-categories/success-center-category.model.js";
import Payment from "#/features/payments/payment.model.js";
import { listFundingAccessPlans } from "#/features/payments/payment-pricing.js";

const ENROLLMENT = ENUMS.ENROLLMENT_STATUS;
const PURPOSE = ENUMS.PAYMENT_PURPOSE;

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const dateFilter = (field, { from, to }) =>
  from || to
    ? { [field]: { ...(from && { $gte: from }), ...(to && { $lte: to }) } }
    : {};

/** Joins the participant and adds `name`; optionally filters by name/email. */
const participantStages = (search) => [
  {
    $lookup: {
      from: User.collection.name,
      localField: "userId",
      foreignField: "_id",
      pipeline: [{ $project: { firstName: 1, lastName: 1, email: 1, planningAccessStatus: 1 } }],
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
      participantEmail: "$participant.email",
    },
  },
  ...(search
    ? [
        {
          $match: {
            $or: [
              { participantName: { $regex: escapeRegex(search), $options: "i" } },
              { participantEmail: { $regex: escapeRegex(search), $options: "i" } },
            ],
          },
        },
      ]
    : []),
];

const paginate = (page, limit) => (rows) => ({
  $facet: {
    total: [{ $count: "count" }],
    rows: [{ $skip: (page - 1) * limit }, { $limit: limit }, ...rows],
  },
});

const pageResult = (result, page, limit) => {
  const total = result?.total[0]?.count ?? 0;
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
};

const COLLATION = { locale: "en", strength: 2 };

/* ─── Enrollments ─── */

const ENROLLMENT_SORT = {
  [ENUMS.ENROLLMENT_SORT_BY.DATE]: "date",
  [ENUMS.ENROLLMENT_SORT_BY.NAME]: "participantName",
  [ENUMS.ENROLLMENT_SORT_BY.EMAIL]: "participantEmail",
  [ENUMS.ENROLLMENT_SORT_BY.TYPE]: "type",
  [ENUMS.ENROLLMENT_SORT_BY.STATUS]: "status",
};

/**
 * One "enrollment" = who enrolled in / activated what:
 *  - a FounderPurchase (funding_access or founder_tier), or
 *  - a SuccessCenterSelection (program_activation; unpaid = pending).
 * Both are projected to the same shape and merged with $unionWith.
 */
export const listEnrollments = async (query) => {
  const { page, limit, search, type, status, from, to, sortBy, sortOrder } = query;

  const purchaseShape = {
    $project: {
      type: "$purpose",
      userId: 1,
      planId: 1,
      fundingAccessPlanKey: 1,
      programAllowance: 1,
      paymentId: 1,
      date: { $ifNull: ["$purchasedAt", "$createdAt"] },
      status: {
        $switch: {
          branches: [
            { case: { $eq: ["$activationStatus", "completed"] }, then: ENROLLMENT.ACTIVE },
            { case: { $eq: ["$activationStatus", "failed"] }, then: ENROLLMENT.FAILED },
          ],
          default: ENROLLMENT.PENDING,
        },
      },
    },
  };

  const selectionShape = {
    $project: {
      type: { $literal: PURPOSE.PROGRAM_ACTIVATION },
      userId: 1,
      programId: 1,
      categoryId: 1,
      paymentId: "$activationPaymentId",
      date: { $ifNull: ["$activationPaidAt", { $ifNull: ["$selectedAt", "$createdAt"] }] },
      status: {
        $cond: [
          { $eq: ["$status", ENUMS.SUCCESS_CENTER_SELECTION_STATUS.REMOVED] },
          ENROLLMENT.REMOVED,
          {
            $cond: [
              { $eq: ["$activationStatus", ENUMS.SELECTION_ACTIVATION_STATUS.PAID] },
              ENROLLMENT.ACTIVE,
              ENROLLMENT.PENDING,
            ],
          },
        ],
      },
    },
  };

  const direction = sortOrder === ENUMS.SORT_ORDER.ASC ? 1 : -1;
  const pipeline = [
    purchaseShape,
    { $unionWith: { coll: SuccessCenterSelection.collection.name, pipeline: [selectionShape] } },
    {
      $match: {
        ...(type && { type }),
        ...(status && { status }),
        ...dateFilter("date", { from, to }),
      },
    },
    ...participantStages(search),
    { $sort: { [ENROLLMENT_SORT[sortBy] ?? "date"]: direction, _id: direction } },
    paginate(page, limit)([
      // Display names — only for the rows on this page.
      {
        $lookup: {
          from: FounderPlan.collection.name,
          localField: "planId",
          foreignField: "_id",
          pipeline: [{ $project: { name: 1 } }],
          as: "plan",
        },
      },
      {
        $lookup: {
          from: SuccessCenterProgram.collection.name,
          localField: "programId",
          foreignField: "_id",
          pipeline: [{ $project: { name: 1 } }],
          as: "program",
        },
      },
      {
        $lookup: {
          from: SuccessCenterCategory.collection.name,
          localField: "categoryId",
          foreignField: "_id",
          pipeline: [{ $project: { name: 1 } }],
          as: "category",
        },
      },
      {
        $lookup: {
          from: Payment.collection.name,
          localField: "paymentId",
          foreignField: "_id",
          pipeline: [{ $project: { status: 1, amount: 1, currency: 1 } }],
          as: "payment",
        },
      },
      {
        $project: {
          type: 1,
          status: 1,
          date: 1,
          participant: {
            _id: "$userId",
            name: "$participantName",
            email: "$participantEmail",
          },
          planningAccessStatus: "$participant.planningAccessStatus",
          fundingAccessPlanKey: 1,
          programAllowance: 1,
          founderPlanName: { $arrayElemAt: ["$plan.name", 0] },
          programName: { $arrayElemAt: ["$program.name", 0] },
          categoryName: { $arrayElemAt: ["$category.name", 0] },
          payment: { $arrayElemAt: ["$payment", 0] },
        },
      },
    ]),
  ];

  const [result] = await FounderPurchase.aggregate(pipeline).collation(COLLATION);

  // Funding Access plan labels live in the pricing settings.
  const fundingLabels = new Map(
    (await listFundingAccessPlans()).map((plan) => [plan.key, plan.label]),
  );
  const enrollments = (result?.rows ?? []).map(
    ({ fundingAccessPlanKey, founderPlanName, programName, categoryName, ...row }) => ({
      ...row,
      itemName:
        row.type === PURPOSE.FUNDING_ACCESS
          ? (fundingLabels.get(fundingAccessPlanKey) ?? fundingAccessPlanKey)
          : row.type === PURPOSE.FOUNDER_TIER
            ? founderPlanName
            : programName,
      itemDetail: row.type === PURPOSE.PROGRAM_ACTIVATION ? categoryName : null,
      paymentStatus: row.payment?.status ?? null,
    }),
  );

  return {
    success: true,
    message: "Enrollments retrieved successfully",
    data: { enrollments, pagination: pageResult(result, page, limit) },
  };
};

/* ─── Payments ─── */

const PAYMENT_SORT = {
  [ENUMS.ADMIN_PAYMENT_SORT_BY.DATE]: "createdAt",
  [ENUMS.ADMIN_PAYMENT_SORT_BY.AMOUNT]: "amount",
  [ENUMS.ADMIN_PAYMENT_SORT_BY.STATUS]: "status",
  [ENUMS.ADMIN_PAYMENT_SORT_BY.NAME]: "participantName",
};

export const listPayments = async (query) => {
  const { page, limit, search, purpose, status, from, to, sortBy, sortOrder } = query;
  const direction = sortOrder === ENUMS.SORT_ORDER.ASC ? 1 : -1;

  const [result] = await Payment.aggregate([
    {
      $match: {
        ...(purpose && { purpose }),
        ...(status && { status }),
        ...dateFilter("createdAt", { from, to }),
      },
    },
    ...participantStages(search),
    { $sort: { [PAYMENT_SORT[sortBy] ?? "createdAt"]: direction, _id: direction } },
    paginate(page, limit)([
      {
        $project: {
          participant: { _id: "$userId", name: "$participantName", email: "$participantEmail" },
          purpose: 1,
          referenceId: 1,
          description: 1,
          amount: 1,
          currency: 1,
          status: 1,
          paymentDate: 1,
          createdAt: 1,
          providerTransactionRef: 1,
          refundStatus: 1,
          disputeStatus: 1,
          failureReason: 1,
        },
      },
    ]),
  ]).collation(COLLATION);

  return {
    success: true,
    message: "Payments retrieved successfully",
    data: {
      payments: result?.rows ?? [],
      pagination: pageResult(result, page, limit),
    },
  };
};

export const getPayment = async (id) => {
  const payment = await Payment.findById(id)
    .select("-__v")
    .populate("userId", "firstName lastName email phone")
    .populate("legalAcceptanceId", "documentType documentVersion acceptedAt context")
    .populate(
      "purchaseId",
      "purpose planId fundingAccessPlanKey programAllowance activationStatus purchasedAt",
    )
    .lean();
  if (!payment) throw new AppError("Payment not found", HTTP_STATUS.NOT_FOUND);
  // TODO(refunds): refund/dispute actions belong to a later milestone.
  return { success: true, message: "Payment retrieved successfully", data: payment };
};

/* ─── Revenue ─── */

/**
 * Basic totals only. Revenue counts COMPLETED payments, grouped by currency
 * (never summed across currencies). The optional range applies to the
 * payment date (falling back to createdAt for unpaid records).
 */
export const getRevenueSummary = async ({ from, to }) => {
  const [result] = await Payment.aggregate([
    { $addFields: { effectiveDate: { $ifNull: ["$paymentDate", "$createdAt"] } } },
    { $match: dateFilter("effectiveDate", { from, to }) },
    {
      $facet: {
        byStatus: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
        revenue: [
          { $match: { status: ENUMS.PAYMENT_STATUS.COMPLETED } },
          { $group: { _id: "$currency", total: { $sum: "$amount" }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ],
        byPurpose: [
          { $match: { status: ENUMS.PAYMENT_STATUS.COMPLETED } },
          {
            $group: {
              _id: { purpose: "$purpose", currency: "$currency" },
              total: { $sum: "$amount" },
              count: { $sum: 1 },
            },
          },
          { $sort: { "_id.purpose": 1 } },
        ],
      },
    },
  ]);

  const counts = Object.fromEntries(
    Object.values(ENUMS.PAYMENT_STATUS).map((value) => [value, 0]),
  );
  for (const { _id, count } of result?.byStatus ?? []) counts[_id] = count;

  // Normalise float sums to the currency's real precision.
  const money = (total, currency) => toChargeableAmount(total, currency);

  return {
    success: true,
    message: "Revenue summary retrieved successfully",
    data: {
      range: { from: from ?? null, to: to ?? null },
      counts: { ...counts, total: Object.values(counts).reduce((a, b) => a + b, 0) },
      revenue: (result?.revenue ?? []).map(({ _id, total, count }) => ({
        currency: _id,
        total: money(total, _id),
        count,
      })),
      byPurpose: (result?.byPurpose ?? []).map(({ _id, total, count }) => ({
        purpose: _id.purpose,
        currency: _id.currency,
        total: money(total, _id.currency),
        count,
      })),
    },
  };
};
