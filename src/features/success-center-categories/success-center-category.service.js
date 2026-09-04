import { ENUMS, HTTP_STATUS } from "#/utils/constants.js";
import { AppError } from "#/utils/appError.js";
import { writeAuditLog } from "#/features/audit-logs/audit-log.service.js";
import SuccessCenterProgram from "#/features/success-center-programs/success-center-program.model.js";
import SuccessCenterCategory from "./success-center-category.model.js";

const findCategoryById = async (id) => {
  const category = await SuccessCenterCategory.findById(id);
  if (!category)
    throw new AppError(
      "Success center category not found",
      HTTP_STATUS.NOT_FOUND,
    );
  return category;
};

const nextOrder = async () => {
  const last = await SuccessCenterCategory.findOne()
    .sort({ order: -1 })
    .select("order");
  return last ? last.order + 1 : 1;
};

const auditCategory = async (user, action, category, beforeValue, afterValue) => {
  await writeAuditLog({
    actorId: user._id,
    action,
    targetType: ENUMS.AUDIT_LOG_TARGET_TYPE.SUCCESS_CENTER_CATEGORY,
    targetId: category._id,
    beforeValue,
    afterValue: afterValue ?? category,
  });
};

export const listSuccessCenterCategories = async () => {
  const categories = await SuccessCenterCategory.find().sort({
    order: 1,
    name: 1,
  });
  return {
    success: true,
    message: "Success center categories retrieved successfully",
    data: categories,
  };
};

export const getSuccessCenterCategoryById = async (id) => {
  const category = await findCategoryById(id);
  return {
    success: true,
    message: "Success center category retrieved successfully",
    data: category,
  };
};

export const createSuccessCenterCategory = async (data, user) => {
  const existing = await SuccessCenterCategory.findOne({ slug: data.slug });
  if (existing)
    throw new AppError(
      `Success center category '${data.slug}' already exists`,
      HTTP_STATUS.CONFLICT,
    );

  const category = new SuccessCenterCategory({
    ...data,
    order: data.order ?? (await nextOrder()),
  });
  await category.save();
  await auditCategory(
    user,
    ENUMS.AUDIT_LOG_ACTION.CREATED_SUCCESS_CENTER_CATEGORY,
    category,
    null,
    category,
  );

  return {
    success: true,
    message: "Success center category created successfully",
    data: category,
  };
};

export const updateSuccessCenterCategory = async (id, data, user) => {
  const category = await findCategoryById(id);
  const beforeValue = category.toObject();

  if (data.slug && data.slug !== category.slug) {
    const taken = await SuccessCenterCategory.findOne({
      slug: data.slug,
      _id: { $ne: category._id },
    });
    if (taken)
      throw new AppError(
        `Success center category '${data.slug}' already exists`,
        HTTP_STATUS.CONFLICT,
      );
  }

  Object.assign(category, data);
  await category.save();
  await auditCategory(
    user,
    ENUMS.AUDIT_LOG_ACTION.UPDATED_SUCCESS_CENTER_CATEGORY,
    category,
    beforeValue,
    category,
  );

  return {
    success: true,
    message: "Success center category updated successfully",
    data: category,
  };
};

export const deleteSuccessCenterCategory = async (id, user) => {
  const category = await findCategoryById(id);
  const programCount = await SuccessCenterProgram.countDocuments({
    categoryId: category._id,
  });
  if (programCount > 0)
    throw new AppError(
      `Cannot delete category while ${programCount} program${programCount === 1 ? "" : "s"} still reference it`,
      HTTP_STATUS.CONFLICT,
    );

  const beforeValue = category.toObject();
  await category.deleteOne();
  await auditCategory(
    user,
    ENUMS.AUDIT_LOG_ACTION.DELETED_SUCCESS_CENTER_CATEGORY,
    category,
    beforeValue,
    null,
  );

  return {
    success: true,
    message: "Success center category deleted successfully",
    data: category,
  };
};
