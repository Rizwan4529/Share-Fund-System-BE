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
import Recommendation from "#/features/recommendations/recommendation.model.js";

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
/**
 * The same rule for many participants at once (admin lists and exports), so
 * every view shows exactly what the selection check enforces.
 * @param {{ _id, planningAccessStatus }[]} users
 * @returns {Promise<Map<string, number|null>>} userId → allowance
 */
export const resolveSelectionAllowances = async (users) => {
  const purchases = await FounderPurchase.find({
    userId: { $in: users.map((user) => user._id) },
    activationStatus: ENUMS.FOUNDER_PURCHASE_ACTIVATION_STATUS.COMPLETED,
  })
    .select("userId purpose planId programAllowance")
    .lean();

  const founderPlanIds = purchases
    .filter((purchase) => purchase.purpose === ENUMS.PAYMENT_PURPOSE.FOUNDER_TIER)
    .map((purchase) => purchase.planId);
  const includedByPlan = new Map(
    (founderPlanIds.length
      ? await FounderPlan.find({ _id: { $in: founderPlanIds } })
          .select("includedSuccessCenters")
          .lean()
      : []
    ).map((plan) => [String(plan._id), plan.includedSuccessCenters?.length ?? 0]),
  );

  const byUser = new Map();
  for (const purchase of purchases) {
    const key = String(purchase.userId);
    if (!byUser.has(key)) byUser.set(key, []);
    byUser.get(key).push(purchase);
  }

  const allowances = new Map();
  for (const user of users) {
    const own = byUser.get(String(user._id)) ?? [];
    if (!own.length) {
      allowances.set(
        String(user._id),
        user.planningAccessStatus === ENUMS.PLANNING_ACCESS_STATUS.ACTIVE ? null : 0,
      );
      continue;
    }
    let allowance = 0;
    for (const purchase of own) {
      if (purchase.purpose === ENUMS.PAYMENT_PURPOSE.FOUNDER_TIER) {
        allowance += includedByPlan.get(String(purchase.planId)) ?? 0;
      } else if (typeof purchase.programAllowance === "number") {
        allowance += purchase.programAllowance;
      } else {
        allowance = null;
        break;
      }
    }
    allowances.set(String(user._id), allowance);
  }
  return allowances;
};

const resolveSelectionAllowance = async (user) =>
  (await resolveSelectionAllowances([user])).get(String(user._id));

/**
 * Whether the participant can select another program, for the selection
 * check and for the UI (GET /me/status). `limit` is null for "no limit".
 */
export const getSelectionAllowance = async (user) => {
  const [limit, used] = await Promise.all([
    resolveSelectionAllowance(user),
    SuccessCenterSelection.countDocuments({
      userId: user._id,
      status: ENUMS.SUCCESS_CENTER_SELECTION_STATUS.ACTIVE,
    }),
  ]);
  const reason =
    limit === 0
      ? CODE.PLANNING_ACCESS_REQUIRED
      : limit !== null && used >= limit
        ? CODE.SELECTION_LIMIT_REACHED
        : null;
  return {
    limit,
    used,
    remaining: limit === null ? null : Math.max(limit - used, 0),
    canSelect: reason === null,
    reason,
  };
};

const assertCanSelectAnother = async (user) => {
  const { limit, reason } = await getSelectionAllowance(user);

  if (reason === CODE.PLANNING_ACCESS_REQUIRED)
    throw new AppError(
      "Choose a Funding Access plan to start selecting Success Center programs.",
      HTTP_STATUS.FORBIDDEN,
      [{ code: CODE.PLANNING_ACCESS_REQUIRED }],
    );

  if (reason === CODE.SELECTION_LIMIT_REACHED)
    throw new AppError(
      `Your plan includes up to ${limit} program${limit === 1 ? "" : "s"}. Remove a program or choose a larger Funding Access plan to add another.`,
      HTTP_STATUS.CONFLICT,
      [{ code: CODE.SELECTION_LIMIT_REACHED, allowance: limit }],
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

/**
 * Adds or changes the goal on an active, unpaid selection. The stored plan
 * (if any) is left as is — the participant recalculates — unless an admin has
 * adjusted it, in which case only an admin can change it.
 */
export const updateSelectionGoal = async (id, data, user) => {
  const selection = await SuccessCenterSelection.findOne({ _id: id, userId: user._id });
  if (!selection) throw new AppError("Selection not found", HTTP_STATUS.NOT_FOUND);
  if (selection.status !== ENUMS.SUCCESS_CENTER_SELECTION_STATUS.ACTIVE)
    throw new AppError("This selection has been removed.", HTTP_STATUS.UNPROCESSABLE_ENTITY, [
      { code: ENUMS.ACTIVATION_ERROR_CODE.SELECTION_REMOVED },
    ]);
  if (selection.activationStatus === ENUMS.SELECTION_ACTIVATION_STATUS.PAID)
    throw new AppError(
      "This program's activation is already paid, so its goal can't change.",
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
      [{ code: ENUMS.ACTIVATION_ERROR_CODE.ACTIVATION_ALREADY_PAID }],
    );
  const locked = await Recommendation.exists({
    selectionId: selection._id,
    "adminOverrides.0": { $exists: true },
  });
  if (locked)
    throw new AppError(
      "Our team has adjusted this plan, so its goal can't be changed here. Contact support if your goal has changed.",
      HTTP_STATUS.CONFLICT,
      [{ code: ENUMS.ACTIVATION_ERROR_CODE.PLAN_LOCKED }],
    );

  selection.goalAmount = data.goalAmount;
  selection.pricingSource = data.pricingSource ?? selection.pricingSource;
  selection.verifiedQuoteAmount =
    selection.pricingSource === ENUMS.SUCCESS_CENTER_PRICING_SOURCE.VERIFIED
      ? (data.verifiedQuoteAmount ?? selection.verifiedQuoteAmount)
      : undefined;
  await selection.save();

  return {
    success: true,
    message: "Goal updated",
    data: await withDisplayInfo(SuccessCenterSelection.findById(selection._id)),
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
