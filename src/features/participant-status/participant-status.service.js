import { ENUMS, PARTICIPANT_STANDING_LABELS } from "#/utils/constants.js";
import { toChargeableAmount } from "#/config/stripe.js";
import { standingOf } from "#/features/admin-participants/admin-participant.service.js";
import SuccessProfile from "#/features/success-profiles/success-profile.model.js";
import SuccessCenterSelection from "#/features/success-center-selections/success-center-selection.model.js";
import Payment from "#/features/payments/payment.model.js";

/** One owner-only snapshot of the participant's standing and history. */
export const getMyStatus = async (user) => {
  const [profile, selections, [paymentSummary]] = await Promise.all([
    SuccessProfile.findOne({ userId: user._id })
      .select("profileType status completionPercentage updatedAt")
      .lean(),
    SuccessCenterSelection.find({
      userId: user._id,
      status: ENUMS.SUCCESS_CENTER_SELECTION_STATUS.ACTIVE,
    })
      .select("programId categoryId obligationType activationStatus activationPaidAt selectedAt")
      .populate("programId", "name programType")
      .populate("categoryId", "name")
      .sort({ selectedAt: -1 })
      .lean(),
    Payment.aggregate([
      { $match: { userId: user._id } },
      {
        $facet: {
          byStatus: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
          completedTotals: [
            { $match: { status: ENUMS.PAYMENT_STATUS.COMPLETED } },
            { $group: { _id: "$currency", total: { $sum: "$amount" } } },
          ],
          latest: [
            { $sort: { createdAt: -1 } },
            { $limit: 1 },
            { $project: { description: 1, amount: 1, currency: 1, status: 1, createdAt: 1, paymentDate: 1 } },
          ],
        },
      },
    ]),
  ]);

  const counts = Object.fromEntries(
    Object.values(ENUMS.PAYMENT_STATUS).map((value) => [value, 0]),
  );
  for (const { _id, count } of paymentSummary?.byStatus ?? []) counts[_id] = count;

  const standing = standingOf(user);

  return {
    success: true,
    message: "Status retrieved successfully",
    data: {
      accountStatus: user.status,
      emailVerified: user.emailVerified,
      founder: {
        status: standing,
        statusLabel: PARTICIPANT_STANDING_LABELS[standing],
        founderTier: user.founderTier,
        foundingParticipant: user.foundingParticipant,
      },
      planningAccessStatus: user.planningAccessStatus,
      successProfile: profile
        ? {
            profileType: profile.profileType,
            status: profile.status,
            completionPercentage: profile.completionPercentage,
            updatedAt: profile.updatedAt,
          }
        : null,
      selections: selections.map((selection) => ({
        _id: selection._id,
        programName: selection.programId?.name ?? null,
        programType: selection.programId?.programType ?? null,
        categoryName: selection.categoryId?.name ?? null,
        obligationType: selection.obligationType,
        activationStatus: selection.activationStatus,
        activationPaidAt: selection.activationPaidAt ?? null,
        selectedAt: selection.selectedAt,
      })),
      payments: {
        counts,
        completedTotals: (paymentSummary?.completedTotals ?? []).map(({ _id, total }) => ({
          currency: _id,
          total: toChargeableAmount(total, _id),
        })),
        latest: paymentSummary?.latest[0] ?? null,
      },
    },
  };
};
