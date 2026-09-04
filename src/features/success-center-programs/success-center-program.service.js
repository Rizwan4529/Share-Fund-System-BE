import { ENUMS, HTTP_STATUS } from "#/utils/constants.js";
import { AppError } from "#/utils/appError.js";
import { writeAuditLog } from "#/features/audit-logs/audit-log.service.js";
import SuccessCenterCategory from "#/features/success-center-categories/success-center-category.model.js";
import SuccessCenterProgram from "./success-center-program.model.js";

const findProgramById = async (id) => {
  const program = await SuccessCenterProgram.findById(id);
  if (!program)
    throw new AppError(
      "Success center program not found",
      HTTP_STATUS.NOT_FOUND,
    );
  return program;
};

const assertCategoryExists = async (categoryId) => {
  const category = await SuccessCenterCategory.findById(categoryId);
  if (!category)
    throw new AppError(
      "Success center category not found",
      HTTP_STATUS.BAD_REQUEST,
    );
  return category;
};

const nextOrder = async () => {
  const last = await SuccessCenterProgram.findOne()
    .sort({ order: -1 })
    .select("order");
  return last ? last.order + 1 : 1;
};

const auditProgram = async (user, action, program, beforeValue, afterValue) => {
  await writeAuditLog({
    actorId: user._id,
    action,
    targetType: ENUMS.AUDIT_LOG_TARGET_TYPE.SUCCESS_CENTER_PROGRAM,
    targetId: program._id,
    beforeValue,
    afterValue: afterValue ?? program,
  });
};

export const listSuccessCenterPrograms = async (query = {}) => {
  const filter = {};
  if (query.categoryId) filter.categoryId = query.categoryId;
  if (query.status) filter.status = query.status;

  const programs = await SuccessCenterProgram.find(filter).sort({
    order: 1,
    name: 1,
  });

  return {
    success: true,
    message: "Success center programs retrieved successfully",
    data: programs,
  };
};

export const getSuccessCenterProgramById = async (id) => {
  const program = await findProgramById(id);
  return {
    success: true,
    message: "Success center program retrieved successfully",
    data: program,
  };
};

export const createSuccessCenterProgram = async (data, user) => {
  await assertCategoryExists(data.categoryId);

  const program = new SuccessCenterProgram({
    ...data,
    order: data.order ?? (await nextOrder()),
  });
  await program.save();
  await auditProgram(
    user,
    ENUMS.AUDIT_LOG_ACTION.CREATED_SUCCESS_CENTER_PROGRAM,
    program,
    null,
    program,
  );

  return {
    success: true,
    message: "Success center program created successfully",
    data: program,
  };
};

export const updateSuccessCenterProgram = async (id, data, user) => {
  const program = await findProgramById(id);
  const beforeValue = program.toObject();

  if (data.categoryId) await assertCategoryExists(data.categoryId);

  if (data.activationRules) {
    program.activationRules = {
      ...(program.activationRules?.toObject?.() ??
        program.activationRules ??
        {}),
      ...data.activationRules,
    };
    const { activationRules: _ignored, ...rest } = data;
    Object.assign(program, rest);
  } else {
    Object.assign(program, data);
  }

  await program.save();
  await auditProgram(
    user,
    ENUMS.AUDIT_LOG_ACTION.UPDATED_SUCCESS_CENTER_PROGRAM,
    program,
    beforeValue,
    program,
  );

  return {
    success: true,
    message: "Success center program updated successfully",
    data: program,
  };
};

export const deleteSuccessCenterProgram = async (id, user) => {
  const program = await findProgramById(id);
  const beforeValue = program.toObject();
  await program.deleteOne();
  await auditProgram(
    user,
    ENUMS.AUDIT_LOG_ACTION.DELETED_SUCCESS_CENTER_PROGRAM,
    program,
    beforeValue,
    null,
  );

  return {
    success: true,
    message: "Success center program deleted successfully",
    data: program,
  };
};
