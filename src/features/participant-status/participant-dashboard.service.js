import {
  DASHBOARD_RECENT_PAYMENTS_LIMIT,
  ENUMS,
  PARTICIPANT_STANDING_LABELS,
} from "#/utils/constants.js";
import { standingOf } from "#/features/admin-participants/admin-participant.service.js";
import { listFundingAccessPlans } from "#/features/payments/payment-pricing.js";
import SuccessProfile from "#/features/success-profiles/success-profile.model.js";
import SuccessCenterSelection from "#/features/success-center-selections/success-center-selection.model.js";
import FounderPurchase from "#/features/founder-purchases/founder-purchase.model.js";
import Payment from "#/features/payments/payment.model.js";
import Recommendation from "#/features/recommendations/recommendation.model.js";
import { toParticipantView } from "#/features/recommendations/recommendation-effective.js";

/*
 * Participant dashboard: one owner-only payload assembled from existing data
 * (profile, selections, recommendations, purchases, payments). Nothing is
 * calculated here — recommendations come through toParticipantView, so they
 * carry the EFFECTIVE figures (admin overrides applied) with projection labels
 * and no admin internals. Seven batched queries; populates are $in lookups,
 * never one query per selection.
 */

const toParticipant = (user) => {
  const standing = standingOf(user);
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    accountStatus: user.status,
    emailVerified: user.emailVerified,
    country: user.country,
    preferredCurrency: user.preferredCurrency ?? null,
    founder: {
      status: standing,
      statusLabel: PARTICIPANT_STANDING_LABELS[standing],
      founderTier: user.founderTier,
      foundingParticipant: Boolean(user.foundingParticipant),
    },
  };
};

const toSelectedCenter = (selection, hasRecommendation) => ({
  _id: selection._id,
  programName: selection.programId?.name ?? null,
  programType: selection.programId?.programType ?? null,
  categoryName: selection.categoryId?.name ?? null,
  obligationType: selection.obligationType,
  status: selection.status,
  activationStatus: selection.activationStatus,
  selectedAt: selection.selectedAt,
  hasRecommendation,
});

const pickProjectionMeta = (projection) =>
  projection
    ? {
        isProjection: true,
        status: projection.status,
        notice: projection.notice,
        basis: projection.basis,
        basisDate: projection.basisDate,
      }
    : null;

/**
 * Compact summary of one recommendation. The featured option is the plan the
 * participant chose, else the fastest plan that fits their budget, else none
 * (the affordability status then explains why).
 */
const toRecommendationSummary = (recommendation, selection) => {
  const view = toParticipantView(recommendation);
  const chosen = view.selectedOption
    ? view.options.find((option) => option.label === view.selectedOption)
    : null;
  const featured = chosen ?? view.options.find((option) => option.affordable) ?? null;
  const first = view.options[0];

  return {
    selectionId: selection._id,
    recommendationId: view._id,
    programName: selection.programId?.name ?? null,
    categoryName: selection.categoryId?.name ?? null,
    goalAmount: first?.totalGoal ?? null,
    activationPercentage: first?.activationPercentage ?? null,
    recommendedActivation: view.oneTimeOption?.totalActivationRequirement ?? null,
    affordabilityStatus: view.affordabilityStatus,
    featuredOption: featured
      ? {
          label: featured.label,
          reason: chosen ? "selected" : "fits_budget",
          months: featured.months,
          scheduledPayment: featured.scheduledPayment,
          totalActivationRequirement: featured.totalActivationRequirement,
          projection: featured.projection ?? null,
        }
      : null,
    oneTimeOption: {
      totalActivationRequirement: view.oneTimeOption?.totalActivationRequirement ?? null,
      projection: view.oneTimeOption?.projection ?? null,
    },
    projection: pickProjectionMeta(view.projection),
    updatedAt: view.updatedAt,
  };
};

const toEnrollment = (purchase, fundingPlans) => {
  const isFundingAccess = purchase.purpose === ENUMS.PAYMENT_PURPOSE.FUNDING_ACCESS;
  const fundingPlan = isFundingAccess
    ? fundingPlans.find((plan) => plan.key === purchase.fundingAccessPlanKey)
    : null;
  return {
    _id: purchase._id,
    purpose: purchase.purpose,
    // Funding Access label from settings; founder plans send their tier name.
    label: isFundingAccess
      ? (fundingPlan?.label ?? purchase.fundingAccessPlanKey ?? null)
      : null,
    founderPlanName: purchase.planId?.name ?? null,
    programAllowance: purchase.programAllowance ?? null,
    status: purchase.activationStatus,
    purchasedAt: purchase.purchasedAt ?? purchase.createdAt,
    amount: purchase.paymentId?.amount ?? null,
    currency: purchase.paymentId?.currency ?? null,
    paymentId: purchase.paymentId?._id ?? null,
  };
};

export const getMyDashboard = async (user) => {
  const owner = { userId: user._id };
  const [profile, selections, purchases, recentPayments, paymentCount, fundingPlans] =
    await Promise.all([
      SuccessProfile.findOne(owner).select("status completionPercentage updatedAt").lean(),
      SuccessCenterSelection.find({
        ...owner,
        status: ENUMS.SUCCESS_CENTER_SELECTION_STATUS.ACTIVE,
      })
        .select("programId categoryId obligationType status activationStatus selectedAt")
        .populate("programId", "name programType")
        .populate("categoryId", "name")
        .sort({ selectedAt: -1 })
        .lean(),
      FounderPurchase.find(owner)
        .populate("planId", "name")
        .populate("paymentId", "amount currency")
        .sort({ purchasedAt: -1, createdAt: -1 })
        .lean(),
      Payment.find(owner)
        .select("purpose description amount currency status paymentDate createdAt providerTransactionRef refundStatus")
        .sort({ createdAt: -1 })
        .limit(DASHBOARD_RECENT_PAYMENTS_LIMIT)
        .lean(),
      Payment.countDocuments(owner),
      listFundingAccessPlans(),
    ]);

  // One query for every selection's recommendation.
  const recommendations = selections.length
    ? await Recommendation.find({
        selectionId: { $in: selections.map((selection) => selection._id) },
      }).lean()
    : [];
  const bySelection = new Map(
    recommendations.map((recommendation) => [String(recommendation.selectionId), recommendation]),
  );

  const planningAccessStatus =
    user.planningAccessStatus ?? ENUMS.PLANNING_ACCESS_STATUS.INACTIVE;

  return {
    success: true,
    message: "Dashboard retrieved successfully",
    data: {
      participant: toParticipant(user),
      successProfile: profile
        ? {
            status: profile.status,
            completionPercentage: profile.completionPercentage,
            updatedAt: profile.updatedAt,
          }
        : null,
      planningAccess: {
        status: planningAccessStatus,
        active: planningAccessStatus === ENUMS.PLANNING_ACCESS_STATUS.ACTIVE,
      },
      selectedCenters: selections.map((selection) =>
        toSelectedCenter(selection, bySelection.has(String(selection._id))),
      ),
      recommendations: selections
        .filter((selection) => bySelection.has(String(selection._id)))
        .map((selection) =>
          toRecommendationSummary(bySelection.get(String(selection._id)), selection),
        ),
      enrollmentHistory: purchases.map((purchase) => toEnrollment(purchase, fundingPlans)),
      paymentHistory: {
        recent: recentPayments.map((payment) => ({
          _id: payment._id,
          purpose: payment.purpose,
          description: payment.description ?? null,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          date: payment.paymentDate ?? payment.createdAt,
          reference: payment.providerTransactionRef ?? null,
          refundStatus: payment.refundStatus,
        })),
        total: paymentCount,
      },
    },
  };
};
