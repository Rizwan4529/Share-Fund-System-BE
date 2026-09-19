import { ENUMS, HTTP_STATUS } from "#/utils/constants.js";
import { AppError } from "#/utils/appError.js";
import { writeAuditLog } from "#/features/audit-logs/audit-log.service.js";
import WaitlistEntry from "#/features/waitlist/waitlist.model.js";
import WaitlistCampaignCategory from "./waitlist-campaign-category.model.js";

export const findCategoryBySlug = async (slug, { activeOnly = false } = {}) => {
  const filter = { slug };
  if (activeOnly) filter.isActive = true;
  const category = await WaitlistCampaignCategory.findOne(filter);
  if (!category)
    throw new AppError(
      `Waitlist campaign category '${slug}' not found`,
      HTTP_STATUS.NOT_FOUND,
    );
  return category;
};

export const assertActiveCategoryExists = async (slug) => {
  await findCategoryBySlug(slug, { activeOnly: true });
};

const findCategoryById = async (id) => {
  const category = await WaitlistCampaignCategory.findById(id);
  if (!category)
    throw new AppError(
      "Waitlist campaign category not found",
      HTTP_STATUS.NOT_FOUND,
    );
  return category;
};

const nextOrder = async () => {
  const last = await WaitlistCampaignCategory.findOne()
    .sort({ order: -1 })
    .select("order");
  return last ? last.order + 1 : 1;
};

export const listWaitlistCampaignCategories = async ({
  includeInactive = false,
} = {}) => {
  const filter = includeInactive ? {} : { isActive: true };
  const categories = await WaitlistCampaignCategory.find(filter).sort({
    order: 1,
    label: 1,
  });

  return {
    success: true,
    message: "Waitlist campaign categories retrieved successfully",
    data: categories,
  };
};

export const getWaitlistCampaignCategoryById = async (id) => {
  const category = await findCategoryById(id);
  return {
    success: true,
    message: "Waitlist campaign category retrieved successfully",
    data: category,
  };
};

export const createWaitlistCampaignCategory = async (data, user) => {
  const existing = await WaitlistCampaignCategory.findOne({ slug: data.slug });
  if (existing)
    throw new AppError(
      `Waitlist campaign category '${data.slug}' already exists`,
      HTTP_STATUS.CONFLICT,
    );

  const category = new WaitlistCampaignCategory({
    ...data,
    order: data.order ?? (await nextOrder()),
  });
  await category.save();

  await writeAuditLog({
    actorId: user._id,
    action: ENUMS.AUDIT_LOG_ACTION.CREATED_WAITLIST_CAMPAIGN_CATEGORY,
    targetType: ENUMS.AUDIT_LOG_TARGET_TYPE.WAITLIST_CAMPAIGN_CATEGORY,
    targetId: category._id,
    afterValue: category,
  });

  return {
    success: true,
    message: "Waitlist campaign category created successfully",
    data: category,
  };
};

export const updateWaitlistCampaignCategory = async (id, data, user) => {
  const category = await findCategoryById(id);
  const beforeValue = category.toObject();

  if (data.slug && data.slug !== category.slug) {
    const taken = await WaitlistCampaignCategory.findOne({
      slug: data.slug,
      _id: { $ne: category._id },
    });
    if (taken)
      throw new AppError(
        `Waitlist campaign category '${data.slug}' already exists`,
        HTTP_STATUS.CONFLICT,
      );

    await WaitlistEntry.updateMany(
      { campaignCategory: category.slug },
      { $set: { campaignCategory: data.slug } },
    );
  }

  Object.assign(category, data);
  await category.save();

  await writeAuditLog({
    actorId: user._id,
    action: ENUMS.AUDIT_LOG_ACTION.UPDATED_WAITLIST_CAMPAIGN_CATEGORY,
    targetType: ENUMS.AUDIT_LOG_TARGET_TYPE.WAITLIST_CAMPAIGN_CATEGORY,
    targetId: category._id,
    beforeValue,
    afterValue: category,
  });

  return {
    success: true,
    message: "Waitlist campaign category updated successfully",
    data: category,
  };
};

export const deleteWaitlistCampaignCategory = async (id, user) => {
  const category = await findCategoryById(id);
  const inUse = await WaitlistEntry.countDocuments({
    campaignCategory: category.slug,
  });
  if (inUse > 0)
    throw new AppError(
      `Cannot delete campaign category '${category.slug}' because ${inUse} waitlist entr${inUse === 1 ? "y uses" : "ies use"} it`,
      HTTP_STATUS.CONFLICT,
    );

  await category.deleteOne();

  await writeAuditLog({
    actorId: user._id,
    action: ENUMS.AUDIT_LOG_ACTION.DELETED_WAITLIST_CAMPAIGN_CATEGORY,
    targetType: ENUMS.AUDIT_LOG_TARGET_TYPE.WAITLIST_CAMPAIGN_CATEGORY,
    targetId: category._id,
    beforeValue: category,
  });

  return {
    success: true,
    message: "Waitlist campaign category deleted successfully",
    data: category,
  };
};
