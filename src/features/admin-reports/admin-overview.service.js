import {
  ADMIN_OVERVIEW_ACTIVITY_LIMIT,
  ADMIN_OVERVIEW_SIGNUP_WINDOWS_DAYS,
  ENUMS,
} from "#/utils/constants.js";
import User from "#/features/users/user.model.js";
import SuccessProfile from "#/features/success-profiles/success-profile.model.js";
import SuccessCenterSelection from "#/features/success-center-selections/success-center-selection.model.js";
import FounderPurchase from "#/features/founder-purchases/founder-purchase.model.js";
import Payment from "#/features/payments/payment.model.js";
import { getRevenueSummary } from "./admin-report.service.js";

/*
 * Admin home metrics: simple totals and counts from existing data (no
 * analytics). The optional from/to range applies to the time-based metrics
 * (signups in range, selections, purchases, revenue); totals and the recent
 * activity list are all-time.
 */

const PURPOSE = ENUMS.PAYMENT_PURPOSE;
const ACTIVITY = ENUMS.ADMIN_ACTIVITY_TYPE;
const MS_PER_DAY = 24 * 60 * 60 * 1000; // unit conversion

const rangeFilter = (field, { from, to }) =>
  from || to
    ? { [field]: { ...(from && { $gte: from }), ...(to && { $lte: to }) } }
    : {};

const countStage = [{ $count: "count" }];
const countOf = (facet) => facet?.[0]?.count ?? 0;

const fullName = (user) =>
  user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() : null;

const participantRef = (user) =>
  user ? { _id: user._id, name: fullName(user), email: user.email } : null;

/** Totals, active accounts and signups (rolling windows + optional range). */
const participantStats = async (range, now) => {
  const windows = Object.fromEntries(
    ADMIN_OVERVIEW_SIGNUP_WINDOWS_DAYS.map((days) => [
      `last${days}`,
      [{ $match: { createdAt: { $gte: new Date(now - days * MS_PER_DAY) } } }, ...countStage],
    ]),
  );
  const hasRange = Boolean(range.from || range.to);

  const [result] = await User.aggregate([
    { $match: { role: ENUMS.ROLES.USER } },
    {
      $facet: {
        total: countStage,
        // "Active" = the account is active (email verified, not suspended/closed).
        active: [{ $match: { status: ENUMS.AUTH_STATUS.ACTIVE } }, ...countStage],
        ...windows,
        ...(hasRange && {
          inRange: [{ $match: rangeFilter("createdAt", range) }, ...countStage],
        }),
      },
    },
  ]);

  return {
    total: countOf(result?.total),
    active: countOf(result?.active),
    newSignups: {
      windows: ADMIN_OVERVIEW_SIGNUP_WINDOWS_DAYS.map((days) => ({
        days,
        count: countOf(result?.[`last${days}`]),
      })),
      inRange: hasRange ? countOf(result?.inRange) : null,
    },
  };
};

const profileStats = async (participantTotal) => {
  const groups = await SuccessProfile.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  const by = Object.fromEntries(groups.map(({ _id, count }) => [_id, count]));
  const completed = by[ENUMS.SUCCESS_PROFILE_STATUS.COMPLETE] ?? 0;
  const incomplete = by[ENUMS.SUCCESS_PROFILE_STATUS.INCOMPLETE] ?? 0;
  return {
    completed,
    incomplete,
    notStarted: Math.max(participantTotal - completed - incomplete, 0),
  };
};

const purchaseCounts = async (range) => {
  const groups = await FounderPurchase.aggregate([
    {
      $match: {
        activationStatus: ENUMS.FOUNDER_PURCHASE_ACTIVATION_STATUS.COMPLETED,
        ...rangeFilter("purchasedAt", range),
      },
    },
    { $group: { _id: "$purpose", count: { $sum: 1 } } },
  ]);
  const by = Object.fromEntries(groups.map(({ _id, count }) => [_id, count]));
  return {
    fundingAccess: by[PURPOSE.FUNDING_ACCESS] ?? 0,
    founderTier: by[PURPOSE.FOUNDER_TIER] ?? 0,
  };
};

/** Latest signups, selections and payments merged into one short list. */
const recentActivity = async () => {
  const limit = ADMIN_OVERVIEW_ACTIVITY_LIMIT;
  const userFields = "firstName lastName email";
  const [signups, selections, payments] = await Promise.all([
    User.find({ role: ENUMS.ROLES.USER })
      .select(`${userFields} status createdAt`)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),
    SuccessCenterSelection.find()
      .select("userId programId status selectedAt")
      .populate("userId", userFields)
      .populate("programId", "name")
      .sort({ selectedAt: -1 })
      .limit(limit)
      .lean(),
    Payment.find()
      .select("userId purpose description amount currency status createdAt")
      .populate("userId", userFields)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),
  ]);

  return [
    ...signups.map((user) => ({
      _id: user._id,
      type: ACTIVITY.SIGNUP,
      at: user.createdAt,
      participant: participantRef(user),
      title: "Account created",
      status: user.status,
    })),
    ...selections.map((selection) => ({
      _id: selection._id,
      type: ACTIVITY.SELECTION,
      at: selection.selectedAt,
      participant: participantRef(selection.userId),
      title: selection.programId?.name ?? "Success Center program",
      status: selection.status,
    })),
    ...payments.map((payment) => ({
      _id: payment._id,
      type: ACTIVITY.PAYMENT,
      at: payment.createdAt,
      participant: participantRef(payment.userId),
      title: payment.description ?? payment.purpose,
      purpose: payment.purpose,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
    })),
  ]
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, limit);
};

export const getOverview = async ({ from, to }) => {
  const range = { from, to };
  const now = Date.now();

  const [participants, selectedCount, purchases, revenueSummary, activity] =
    await Promise.all([
      participantStats(range, now),
      SuccessCenterSelection.countDocuments({
        status: ENUMS.SUCCESS_CENTER_SELECTION_STATUS.ACTIVE,
        ...rangeFilter("selectedAt", range),
      }),
      purchaseCounts(range),
      // Reuses the revenue report: completed payments, grouped by currency.
      getRevenueSummary(range),
      recentActivity(),
    ]);
  const revenue = revenueSummary.data;

  return {
    success: true,
    message: "Overview retrieved successfully",
    data: {
      range: { from: from ?? null, to: to ?? null },
      participants,
      successProfiles: await profileStats(participants.total),
      successCentersSelected: selectedCount,
      fundingAccess: {
        purchases: purchases.fundingAccess,
        revenue: revenue.byPurpose
          .filter((row) => row.purpose === PURPOSE.FUNDING_ACCESS)
          .map(({ currency, total, count }) => ({ currency, total, count })),
      },
      founderTierPurchases: purchases.founderTier,
      totalRevenue: revenue.revenue,
      paymentCounts: revenue.counts,
      recentActivity: activity,
    },
  };
};
