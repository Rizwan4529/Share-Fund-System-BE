import { ENUMS, HTTP_STATUS, RECOMMENDATION_ONE_TIME_KEY } from "#/utils/constants.js";
import { AppError } from "#/utils/appError.js";
import SuccessCenterSelection from "#/features/success-center-selections/success-center-selection.model.js";
import SuccessCenterProgram from "#/features/success-center-programs/success-center-program.model.js";
import SuccessProfile from "#/features/success-profiles/success-profile.model.js";
import Recommendation from "./recommendation.model.js";
import {
  resolveActivationRules,
  ruleValues,
  settingKeyForRule,
} from "./activation-rules.js";
import {
  calculateActivationPlan,
  resolveGoalAmount,
} from "./activation-calculation.js";
import { toParticipantView } from "./recommendation-effective.js";

const findOwnedSelection = async (selectionId, user) => {
  // Scoped to the owner: someone else's selection reads as "not found".
  const selection = await SuccessCenterSelection.findOne({
    _id: selectionId,
    userId: user._id,
  }).lean();
  if (!selection)
    throw new AppError("Selection not found", HTTP_STATUS.NOT_FOUND);
  return selection;
};

const CODE = ENUMS.ACTIVATION_ERROR_CODE;

/** 422 with a code the frontend can map to the right "fix this" action. */
const unprocessable = (message, code) =>
  new AppError(message, HTTP_STATUS.UNPROCESSABLE_ENTITY, [{ code }]);

/**
 * Projection start date: the activation payment date once paid, otherwise the
 * moment of calculation (i.e. "if you activated today").
 */
const projectionBasisFor = (selection) =>
  selection.activationStatus === ENUMS.SELECTION_ACTIVATION_STATUS.PAID &&
  selection.activationPaidAt
    ? {
        basis: ENUMS.PROJECTION_BASIS.ACTIVATION_PAID_DATE,
        basisDate: new Date(selection.activationPaidAt),
      }
    : { basis: ENUMS.PROJECTION_BASIS.CALCULATION_DATE, basisDate: new Date() };

/**
 * Upsert the single snapshot for a selection (a lost upsert race retries).
 * A new computed result needs a fresh admin review, so current overrides and
 * approval are cleared; the adminAdjustments history is kept.
 */
const saveSnapshot = async (selectionId, fields) => {
  const write = () =>
    Recommendation.findOneAndUpdate(
      { selectionId },
      {
        $set: {
          ...fields,
          selectionId,
          adminAdjusted: false,
          adminOverrides: [],
          reviewStatus: ENUMS.RECOMMENDATION_REVIEW_STATUS.PENDING_REVIEW,
        },
        // A previously chosen plan may not exist in the new options.
        $unset: {
          selectedOption: 1,
          approvedBy: 1,
          approvedAt: 1,
          adjustmentReason: 1,
        },
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );
  try {
    return await write();
  } catch (err) {
    if (err.code === 11000) return write();
    throw err;
  }
};

export const calculateForSelection = async (selectionId, user) => {
  const selection = await findOwnedSelection(selectionId, user);
  if (selection.status !== ENUMS.SUCCESS_CENTER_SELECTION_STATUS.ACTIVE)
    throw unprocessable("This selection has been removed.", CODE.SELECTION_REMOVED);

  const program = await SuccessCenterProgram.findById(selection.programId)
    .select("name programType goalNature activationRules updatedAt")
    .lean();
  if (!program)
    throw new AppError("Success Center program not found", HTTP_STATUS.NOT_FOUND);

  if (program.programType === ENUMS.SUCCESS_CENTER_PROGRAM_TYPE.PLANNING) {
    return {
      success: true,
      message: "This is a planning-only program — no activation or payment is needed.",
      data: {
        activationRequired: false,
        selectionId: selection._id,
        programType: program.programType,
      },
    };
  }

  const profile = await SuccessProfile.findOne({ userId: user._id })
    .select("financials status")
    .lean();
  if (!profile)
    throw unprocessable(
      "Create your Success Profile before calculating activation.",
      CODE.PROFILE_REQUIRED,
    );
  // A plan from half-answered figures would count unanswered costs as $0.
  if (profile.status !== ENUMS.SUCCESS_PROFILE_STATUS.COMPLETE)
    throw unprocessable(
      "Complete and confirm your Success Profile before calculating activation.",
      CODE.PROFILE_INCOMPLETE,
    );
  if (!(profile.financials?.netMonthlyIncome > 0))
    throw unprocessable(
      "Add your net monthly income to your Success Profile before calculating activation.",
      CODE.INCOME_REQUIRED,
    );

  const goalAmount = resolveGoalAmount(selection);
  if (goalAmount == null)
    throw unprocessable(
      "A goal amount is required for this selection (or a verified quote amount when pricing is verified).",
      CODE.GOAL_AMOUNT_REQUIRED,
    );

  // An admin's adjustment (e.g. "not eligible yet", a lowered payment) stays
  // in force until an admin resets it — recalculating can't undo it.
  const existing = await Recommendation.findOne({ selectionId: selection._id })
    .select("adminOverrides")
    .lean();
  if (existing?.adminOverrides?.length)
    throw new AppError(
      "Our team has reviewed and adjusted this plan, so it can't be recalculated here. Contact support if your circumstances have changed.",
      HTTP_STATUS.CONFLICT,
      [{ code: CODE.PLAN_LOCKED }],
    );

  const { resolved, settingsUsed } = await resolveActivationRules(program);
  const plan = calculateActivationPlan({
    goalAmount,
    financials: profile.financials,
    rules: ruleValues(resolved),
    projectionContext: {
      goalNature: program.goalNature,
      ...projectionBasisFor(selection),
    },
  });

  const recommendation = await saveSnapshot(selection._id, {
    userId: user._id,
    inputSnapshot: plan.inputSnapshot,
    options: plan.options,
    oneTimeOption: plan.oneTimeOption,
    projection: {
      ...plan.projection,
      // Report missing rules by the settings key an admin would set.
      missingRules: plan.projection.missingRules.map(settingKeyForRule),
    },
    affordabilityStatus: plan.affordabilityStatus,
    suggestedAlternatives: plan.suggestedAlternatives,
    rulesVersionUsed: {
      resolvedRules: resolved,
      settings: settingsUsed,
      programUpdatedAt: program.updatedAt,
    },
  });

  return {
    success: true,
    message: "Activation plan calculated successfully",
    data: {
      activationRequired: true,
      goalAmount: plan.goalAmount,
      activationPercentage: plan.activationPercentage,
      totalActivationRequirement: plan.totalActivationRequirement,
      recommendation: toParticipantView(recommendation),
    },
  };
};

const SELECTABLE_STATUSES = [
  ENUMS.RECOMMENDATION_AFFORDABILITY_STATUS.ELIGIBLE,
  ENUMS.RECOMMENDATION_AFFORDABILITY_STATUS.ELIGIBLE_WITH_ADJUSTMENT,
];

/**
 * Records the option the participant chose (a paced label or "one_time"),
 * against the EFFECTIVE plan: the status must allow proceeding and the option
 * must fit (monthly payment within safe capacity / one-time within savings).
 */
export const selectOptionForSelection = async (selectionId, option, user) => {
  const selection = await findOwnedSelection(selectionId, user);
  if (selection.activationStatus === ENUMS.SELECTION_ACTIVATION_STATUS.PAID)
    throw unprocessable("This program's activation is already paid.", CODE.ACTIVATION_ALREADY_PAID);
  const recommendation = await Recommendation.findOne({ selectionId });
  if (!recommendation)
    throw new AppError(
      "No activation plan has been calculated for this selection yet",
      HTTP_STATUS.NOT_FOUND,
    );

  const view = toParticipantView(recommendation);
  const chosen =
    option === RECOMMENDATION_ONE_TIME_KEY
      ? view.oneTimeOption
      : view.options.find((item) => item.label === option);
  if (!chosen)
    throw unprocessable("That option isn't part of your plan.", CODE.OPTION_NOT_AVAILABLE);
  if (!SELECTABLE_STATUSES.includes(view.affordabilityStatus) || chosen.affordable === false)
    throw unprocessable(
      "That option doesn't fit your budget right now — see the suggestions on your plan.",
      CODE.OPTION_NOT_AVAILABLE,
    );

  recommendation.selectedOption = option;
  recommendation.selectedOptionAt = new Date();
  await recommendation.save();
  return {
    success: true,
    message: "Option selected",
    data: toParticipantView(recommendation),
  };
};

export const getForSelection = async (selectionId, user) => {
  await findOwnedSelection(selectionId, user);
  const recommendation = await Recommendation.findOne({ selectionId }).lean();
  if (!recommendation)
    throw new AppError(
      "No activation plan has been calculated for this selection yet",
      HTTP_STATUS.NOT_FOUND,
    );
  return {
    success: true,
    message: "Activation plan retrieved successfully",
    // Effective figures: admin overrides applied, computed originals hidden.
    data: toParticipantView(recommendation),
  };
};
