import {
  ENUMS,
  HTTP_STATUS,
  SELECTABLE_PROGRAM_STATUSES,
} from "#/utils/constants.js";
import { AppError } from "#/utils/appError.js";
import SuccessCenterCategory from "#/features/success-center-categories/success-center-category.model.js";
import SuccessCenterProgram from "#/features/success-center-programs/success-center-program.model.js";
import SuccessCenterSelection from "./success-center-selection.model.js";
import FounderPurchase from "#/features/founder-purchases/founder-purchase.model.js";
import FounderPlan from "#/features/founder-plans/founder-plan.model.js";

const DUPLICATE_MESSAGE = "You have already selected this program";

const withDisplayInfo = (query) =>
  query
    .populate("programId", "name programType goalNature status")
    .populate("categoryId", "name slug icon");

/** The program must exist, be published, and sit in an active category. */
const findSelectableProgram = async (programId) => {
  const program = await SuccessCenterProgram.findById(programId)
    .select("categoryId status")
    .lean();
  const category =
    program &&
    (await SuccessCenterCategory.exists({
      _id: program.categoryId,
      status: ENUMS.SUCCESS_CENTER_CATEGORY_STATUS.ACTIVE,
    }));

  // Drafts/inactive programs are invisible to participants: report "not found".
  if (
    !program ||
    !category ||
    (program.status !== ENUMS.SUCCESS_CENTER_PROGRAM_STATUS.COMING_SOON &&
      !SELECTABLE_PROGRAM_STATUSES.includes(program.status))
  )
    throw new AppError("Success Center program not found", HTTP_STATUS.NOT_FOUND);

  if (!SELECTABLE_PROGRAM_STATUSES.includes(program.status))
    throw new AppError(
      "This program is coming soon and can't be activated yet",
      HTTP_STATUS.BAD_REQUEST,
    );

  return program;
};

const CODE = ENUMS.SELECTION_ERROR_CODE;

/**
 * How many active programs the participant may hold, from what they bought:
 * each Funding Access purchase adds its frozen programAllowance and each
 * Founder tier adds its included programs. Returns null for "no limit" (an
 * admin granted planning access without a purchase, or an older purchase
 * whose allowance wasn't recorded) and 0 when the participant has no access.
 */
const resolveSelectionAllowance = async (user) => {
  const purchases = await FounderPurchase.find({
    userId: user._id,
    activationStatus: ENUMS.FOUNDER_PURCHASE_ACTIVATION_STATUS.COMPLETED,
  })
    .select("purpose planId programAllowance")
    .lean();

  if (!purchases.length)
    return user.planningAccessStatus === ENUMS.PLANNING_ACCESS_STATUS.ACTIVE ? null : 0;

  let allowance = 0;
  const founderPlanIds = [];
  for (const purchase of purchases) {
    if (purchase.purpose === ENUMS.PAYMENT_PURPOSE.FOUNDER_TIER) {
      founderPlanIds.push(purchase.planId);
    } else if (typeof purchase.programAllowance === "number") {
      allowance += purchase.programAllowance;
    } else {
      return null;
    }
  }

  if (founderPlanIds.length) {
    const plans = await FounderPlan.find({ _id: { $in: founderPlanIds } })
      .select("includedSuccessCenters")
      .lean();
    allowance += plans.reduce(
      (sum, plan) => sum + (plan.includedSuccessCenters?.length ?? 0),
      0,
    );
  }
  return allowance;
};

const assertCanSelectAnother = async (user) => {
  const allowance = await resolveSelectionAllowance(user);
  if (allowance === null) return;

  if (allowance === 0)
    throw new AppError(
      "Choose a Funding Access plan to start selecting Success Center programs.",
      HTTP_STATUS.FORBIDDEN,
      [{ code: CODE.PLANNING_ACCESS_REQUIRED }],
    );

  const active = await SuccessCenterSelection.countDocuments({
    userId: user._id,
    status: ENUMS.SUCCESS_CENTER_SELECTION_STATUS.ACTIVE,
  });
  if (active >= allowance)
    throw new AppError(
      `Your plan includes up to ${allowance} program${allowance === 1 ? "" : "s"}. Remove a program or choose a larger Funding Access plan to add another.`,
      HTTP_STATUS.CONFLICT,
      [{ code: CODE.SELECTION_LIMIT_REACHED, allowance }],
    );
};

export const createSelection = async (data, user) => {
  const program = await findSelectableProgram(data.programId);

  const existing = await SuccessCenterSelection.exists({
    userId: user._id,
    programId: data.programId,
    status: ENUMS.SUCCESS_CENTER_SELECTION_STATUS.ACTIVE,
  });
  if (existing) throw new AppError(DUPLICATE_MESSAGE, HTTP_STATUS.CONFLICT);

  await assertCanSelectAnother(user);

  let selection;
  try {
    selection = await SuccessCenterSelection.create({
      ...data,
      userId: user._id,
      categoryId: program.categoryId,
      status: ENUMS.SUCCESS_CENTER_SELECTION_STATUS.ACTIVE,
    });
  } catch (err) {
    // The partial unique index catches a concurrent duplicate request.
    if (err.code === 11000)
      throw new AppError(DUPLICATE_MESSAGE, HTTP_STATUS.CONFLICT);
    throw err;
  }

  return {
    success: true,
    message: "Program selected successfully",
    data: await withDisplayInfo(SuccessCenterSelection.findById(selection._id)),
  };
};

export const listMySelections = async (user, { status }) => {
  const selections = await withDisplayInfo(
    SuccessCenterSelection.find({ userId: user._id, status }).sort({
      selectedAt: -1,
    }),
  );

  return {
    success: true,
    message: "Selections retrieved successfully",
    data: selections,
  };
};

export const removeSelection = async (id, user) => {
  // Scoped to the owner: someone else's selection reads as "not found".
  const selection = await SuccessCenterSelection.findOne({
    _id: id,
    userId: user._id,
  });
  if (!selection)
    throw new AppError("Selection not found", HTTP_STATUS.NOT_FOUND);

  if (selection.status !== ENUMS.SUCCESS_CENTER_SELECTION_STATUS.REMOVED) {
    selection.status = ENUMS.SUCCESS_CENTER_SELECTION_STATUS.REMOVED;
    await selection.save();
  }

  return {
    success: true,
    message: "Selection removed successfully",
    data: await withDisplayInfo(SuccessCenterSelection.findById(selection._id)),
  };
};
