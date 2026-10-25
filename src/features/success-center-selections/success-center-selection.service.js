import {
  ENUMS,
  HTTP_STATUS,
  SELECTABLE_PROGRAM_STATUSES,
} from "#/utils/constants.js";
import { AppError } from "#/utils/appError.js";
import SuccessCenterCategory from "#/features/success-center-categories/success-center-category.model.js";
import SuccessCenterProgram from "#/features/success-center-programs/success-center-program.model.js";
import SuccessCenterSelection from "./success-center-selection.model.js";

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

export const createSelection = async (data, user) => {
  const program = await findSelectableProgram(data.programId);

  const existing = await SuccessCenterSelection.exists({
    userId: user._id,
    programId: data.programId,
    status: ENUMS.SUCCESS_CENTER_SELECTION_STATUS.ACTIVE,
  });
  if (existing) throw new AppError(DUPLICATE_MESSAGE, HTTP_STATUS.CONFLICT);

  // TODO(payments): enforce the participant's selection allowance here once
  // funding-access purchases exist — resolve the purchase (purchaseId), read
  // its allowance (e.g. $50 = 1 program, $100 = 3) and reject when the count
  // of active selections tied to it is already at the limit.

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
