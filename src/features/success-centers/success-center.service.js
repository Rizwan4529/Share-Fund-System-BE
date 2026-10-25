import {
  ENUMS,
  HTTP_STATUS,
  PARTICIPANT_VISIBLE_PROGRAM_STATUSES,
} from "#/utils/constants.js";
import { AppError } from "#/utils/appError.js";
import SuccessCenterCategory from "#/features/success-center-categories/success-center-category.model.js";
import SuccessCenterProgram from "#/features/success-center-programs/success-center-program.model.js";

// Browsing is free and read-only: nothing in this file writes a record.

const CATEGORY_FIELDS =
  "name slug description programsIntroduction order image icon";
const PROGRAM_LIST_FIELDS =
  "categoryId name description status programType goalNature order";
// activationRules stay server-side; they feed the later activation-amount task.
const PROGRAM_DETAIL_FIELDS = `${PROGRAM_LIST_FIELDS} educationalContent programQuestions`;

const findActiveCategory = async (categoryId) => {
  const category = await SuccessCenterCategory.findOne({
    _id: categoryId,
    status: ENUMS.SUCCESS_CENTER_CATEGORY_STATUS.ACTIVE,
  })
    .select(CATEGORY_FIELDS)
    .lean();
  if (!category)
    throw new AppError("Success Center category not found", HTTP_STATUS.NOT_FOUND);
  return category;
};

export const listCategories = async () => {
  const categories = await SuccessCenterCategory.find({
    status: ENUMS.SUCCESS_CENTER_CATEGORY_STATUS.ACTIVE,
  })
    .select(CATEGORY_FIELDS)
    .sort({ order: 1, name: 1 })
    .lean();

  return {
    success: true,
    message: "Success Center categories retrieved successfully",
    data: categories,
  };
};

export const listCategoryPrograms = async (categoryId) => {
  const category = await findActiveCategory(categoryId);
  const programs = await SuccessCenterProgram.find({
    categoryId,
    status: { $in: PARTICIPANT_VISIBLE_PROGRAM_STATUSES },
  })
    .select(PROGRAM_LIST_FIELDS)
    .sort({ order: 1, name: 1 })
    .lean();

  return {
    success: true,
    message: "Success Center programs retrieved successfully",
    data: { category, programs },
  };
};

export const getProgram = async (programId) => {
  const program = await SuccessCenterProgram.findOne({
    _id: programId,
    status: { $in: PARTICIPANT_VISIBLE_PROGRAM_STATUSES },
  })
    .select(PROGRAM_DETAIL_FIELDS)
    .lean();
  if (!program)
    throw new AppError("Success Center program not found", HTTP_STATUS.NOT_FOUND);

  // A program under an inactive category is hidden too.
  const category = await findActiveCategory(program.categoryId).catch(() => {
    throw new AppError("Success Center program not found", HTTP_STATUS.NOT_FOUND);
  });

  return {
    success: true,
    message: "Success Center program retrieved successfully",
    data: { ...program, category },
  };
};
