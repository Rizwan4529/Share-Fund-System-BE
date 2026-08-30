import { ENUMS, HTTP_STATUS } from "#/utils/constants.js";
import { AppError } from "#/utils/appError.js";
import Setting from "#/features/settings/setting.model.js";
import { writeAuditLog } from "#/features/audit-logs/audit-log.service.js";
import SettingCategory from "./setting-category.model.js";

export const findCategoryBySlug = async (slug) => {
  const category = await SettingCategory.findOne({ slug });
  if (!category)
    throw new AppError(
      `Setting category '${slug}' not found`,
      HTTP_STATUS.NOT_FOUND,
    );
  return category;
};

export const assertCategoryExists = async (slug) => {
  await findCategoryBySlug(slug);
};

const findCategoryById = async (id) => {
  const category = await SettingCategory.findById(id);
  if (!category)
    throw new AppError("Setting category not found", HTTP_STATUS.NOT_FOUND);
  return category;
};

const nextOrder = async () => {
  const last = await SettingCategory.findOne().sort({ order: -1 }).select("order");
  return last ? last.order + 1 : 1;
};

export const listSettingCategories = async () => {
  const categories = await SettingCategory.find().sort({ order: 1, label: 1 });
  return {
    success: true,
    message: "Setting categories retrieved successfully",
    data: categories,
  };
};

export const createSettingCategory = async (data, user) => {
  const existing = await SettingCategory.findOne({ slug: data.slug });
  if (existing)
    throw new AppError(
      `Setting category '${data.slug}' already exists`,
      HTTP_STATUS.CONFLICT,
    );

  const category = new SettingCategory({
    ...data,
    order: data.order ?? (await nextOrder()),
  });
  await category.save();
  await writeAuditLog({
    actorId: user._id,
    action: ENUMS.AUDIT_LOG_ACTION.CREATED_SETTING_CATEGORY,
    targetType: ENUMS.AUDIT_LOG_TARGET_TYPE.SETTING_CATEGORY,
    targetId: category._id,
    afterValue: category,
  });

  return {
    success: true,
    message: "Setting category created successfully",
    data: category,
  };
};

export const updateSettingCategory = async (id, data, user) => {
  const category = await findCategoryById(id);
  const beforeValue = category.toObject();

  if (data.slug && data.slug !== category.slug) {
    const taken = await SettingCategory.findOne({
      slug: data.slug,
      _id: { $ne: category._id },
    });
    if (taken)
      throw new AppError(
        `Setting category '${data.slug}' already exists`,
        HTTP_STATUS.CONFLICT,
      );

    await Setting.updateMany(
      { category: category.slug },
      { $set: { category: data.slug } },
    );
  }

  Object.assign(category, data);
  await category.save();
  await writeAuditLog({
    actorId: user._id,
    action: ENUMS.AUDIT_LOG_ACTION.UPDATED_SETTING_CATEGORY,
    targetType: ENUMS.AUDIT_LOG_TARGET_TYPE.SETTING_CATEGORY,
    targetId: category._id,
    beforeValue,
    afterValue: category,
  });

  return {
    success: true,
    message: "Setting category updated successfully",
    data: category,
  };
};

export const deleteSettingCategory = async (id, user) => {
  const category = await findCategoryById(id);
  const inUse = await Setting.countDocuments({ category: category.slug });
  if (inUse > 0)
    throw new AppError(
      `Cannot delete category '${category.label}' while ${inUse} setting${inUse === 1 ? "" : "s"} still use it`,
      HTTP_STATUS.CONFLICT,
    );

  await category.deleteOne();
  await writeAuditLog({
    actorId: user._id,
    action: ENUMS.AUDIT_LOG_ACTION.DELETED_SETTING_CATEGORY,
    targetType: ENUMS.AUDIT_LOG_TARGET_TYPE.SETTING_CATEGORY,
    targetId: category._id,
    beforeValue: category,
  });

  return {
    success: true,
    message: "Setting category deleted successfully",
    data: category,
  };
};
