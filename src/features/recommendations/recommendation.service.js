import { ENUMS, HTTP_STATUS } from "#/utils/constants.js";
import { AppError } from "#/utils/appError.js";
import SuccessCenterSelection from "#/features/success-center-selections/success-center-selection.model.js";
import SuccessCenterProgram from "#/features/success-center-programs/success-center-program.model.js";
import SuccessProfile from "#/features/success-profiles/success-profile.model.js";
import Recommendation from "./recommendation.model.js";
import { resolveActivationRules, ruleValues } from "./activation-rules.js";
import {
  calculateActivationPlan,
  resolveGoalAmount,
} from "./activation-calculation.js";

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

/** Upsert the single snapshot for a selection (a lost upsert race retries). */
const saveSnapshot = async (selectionId, fields) => {
  const write = () =>
    Recommendation.findOneAndUpdate(
      { selectionId },
      {
        $set: { ...fields, selectionId, adminAdjusted: false },
        // A previously chosen plan may not exist in the new options.
        $unset: { selectedOption: 1 },
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
    .select("name programType activationRules updatedAt")
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
    .select("financials")
    .lean();
  if (!profile)
    throw unprocessable(
      "Create your Success Profile before calculating activation.",
      CODE.PROFILE_REQUIRED,
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

  const { resolved, settingsUsed } = await resolveActivationRules(program);
  const plan = calculateActivationPlan({
    goalAmount,
    financials: profile.financials,
    rules: ruleValues(resolved),
  });

  const recommendation = await saveSnapshot(selection._id, {
    userId: user._id,
    inputSnapshot: plan.inputSnapshot,
    options: plan.options,
    oneTimeOption: plan.oneTimeOption,
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
      recommendation,
    },
  };
};

export const getForSelection = async (selectionId, user) => {
  await findOwnedSelection(selectionId, user);
  const recommendation = await Recommendation.findOne({ selectionId });
  if (!recommendation)
    throw new AppError(
      "No activation plan has been calculated for this selection yet",
      HTTP_STATUS.NOT_FOUND,
    );
  return {
    success: true,
    message: "Activation plan retrieved successfully",
    data: recommendation,
  };
};

export const getForSelectionAsAdmin = async (selectionId) => {
  const recommendation = await Recommendation.findOne({ selectionId })
    .populate("userId", "firstName lastName email")
    .populate({
      path: "selectionId",
      select: "programId categoryId obligationType goalAmount pricingSource verifiedQuoteAmount status",
      populate: [
        { path: "programId", select: "name programType goalNature" },
        { path: "categoryId", select: "name" },
      ],
    });
  if (!recommendation)
    throw new AppError(
      "No activation plan has been calculated for this selection",
      HTTP_STATUS.NOT_FOUND,
    );
  return {
    success: true,
    message: "Activation plan retrieved successfully",
    data: recommendation,
  };
};
