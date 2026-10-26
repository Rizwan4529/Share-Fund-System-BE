import { ENUMS, HTTP_STATUS } from "#/utils/constants.js";
import { AppError } from "#/utils/appError.js";
import Setting from "./setting.model.js";
import { assertBoundPairInOrder, assertSettingValueValid } from "./setting-rules.js";
import { writeAuditLog } from "#/features/audit-logs/audit-log.service.js";
import { assertCategoryExists } from "#/features/setting-categories/setting-category.service.js";

const USER_FIELDS = "firstName lastName email";

const assertValueMatchesDataType = (value, dataType) => {
  const isValid =
    ((dataType === ENUMS.SETTINGS_DATA_TYPE.NUMBER ||
      dataType === ENUMS.SETTINGS_DATA_TYPE.PERCENTAGE) &&
      typeof value === "number") ||
    (dataType === ENUMS.SETTINGS_DATA_TYPE.OBJECT &&
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value)) ||
    (dataType === ENUMS.SETTINGS_DATA_TYPE.ARRAY && Array.isArray(value));

  if (!isValid)
    throw new AppError(
      `Value does not match data type '${dataType}'`,
      HTTP_STATUS.BAD_REQUEST,
    );
};

const readCurrentValue = async (key) =>
  (await Setting.findOne({ key }).select("value").lean())?.value;

const assertValueUsable = async (key, dataType, value) => {
  assertValueMatchesDataType(value, dataType);
  assertSettingValueValid(key, dataType, value);
  await assertBoundPairInOrder(key, value, readCurrentValue);
};

/**
 * Applies scheduled changes whose effective date has arrived: the scheduled
 * value becomes current and the replaced value moves into versionHistory.
 * Runs before every read so consumers never see a stale or early value. Each
 * change is applied with a conditional update, so concurrent reads can't
 * apply it twice.
 */
const applyDueChanges = async (filter = {}) => {
  const now = new Date();
  const due = await Setting.find({
    ...filter,
    "scheduledChanges.effectiveDate": { $lte: now },
  })
    .select("value scheduledChanges")
    .lean();

  for (const setting of due) {
    const ready = setting.scheduledChanges
      .filter((change) => change.effectiveDate <= now)
      .sort((a, b) => a.effectiveDate - b.effectiveDate);

    let current = setting.value;
    for (const change of ready) {
      const applied = await Setting.findOneAndUpdate(
        { _id: setting._id, "scheduledChanges._id": change._id },
        {
          $set: {
            value: change.value,
            effectiveDate: change.effectiveDate,
            updatedBy: change.updatedBy,
          },
          $push: {
            versionHistory: {
              value: current,
              updatedBy: change.updatedBy,
              at: now,
              reason: change.reason,
            },
          },
          $pull: { scheduledChanges: { _id: change._id } },
        },
      );
      if (applied)
        await writeAuditLog({
          actorId: change.updatedBy,
          action: ENUMS.AUDIT_LOG_ACTION.UPDATE_SETTING,
          targetType: ENUMS.AUDIT_LOG_TARGET_TYPE.SETTING,
          targetId: setting._id,
          beforeValue: { value: current },
          afterValue: {
            value: change.value,
            reason: change.reason,
            effectiveDate: change.effectiveDate,
            appliedScheduledChange: true,
          },
        });
      current = change.value;
    }
  }
};

const findSettingByKey = async (key) => {
  const setting = await Setting.findOne({ key });
  if (!setting)
    throw new AppError(`Setting '${key}' not found`, HTTP_STATUS.NOT_FOUND);
  return setting;
};

export const getSetting = async (key) => {
  await applyDueChanges({ key });
  const setting = await findSettingByKey(key);
  return setting.value;
};

/**
 * Batch read for config consumers (e.g. the activation calculation). Unlike
 * getSetting, a missing key is not an error — it's simply absent from the
 * returned Map so callers can decide whether that key is optional.
 */
export const getSettingsByKeys = async (keys) => {
  await applyDueChanges({ key: { $in: keys } });
  const settings = await Setting.find({ key: { $in: keys } })
    .select("key value versionHistory updatedAt")
    .lean();
  return new Map(settings.map((setting) => [setting.key, setting]));
};

export const getSettingByKey = async (key) => {
  await applyDueChanges({ key });
  const setting = await Setting.findOne({ key })
    .populate("versionHistory.updatedBy", USER_FIELDS)
    .populate("scheduledChanges.updatedBy", USER_FIELDS);
  if (!setting)
    throw new AppError(`Setting '${key}' not found`, HTTP_STATUS.NOT_FOUND);
  return {
    success: true,
    message: "Setting retrieved successfully",
    data: setting,
  };
};

export const getSettingsByCategory = async (category) => {
  await assertCategoryExists(category);
  await applyDueChanges({ category });
  const settings = await Setting.find({ category }).sort({ key: 1 });
  return {
    success: true,
    message: "Settings retrieved successfully",
    data: settings,
  };
};

export const listSettings = async () => {
  await applyDueChanges();
  const settings = await Setting.find().sort({ category: 1, key: 1 });
  return {
    success: true,
    message: "Settings retrieved successfully",
    data: settings,
  };
};

export const insertSettings = async (data, user) => {
  await assertCategoryExists(data.category);
  await assertValueUsable(data.key, data.dataType, data.value);

  const now = new Date();
  if (data.effectiveDate && data.effectiveDate > now)
    throw new AppError(
      "A new setting takes effect as soon as it's created. Create it now, then schedule later changes with an effective date.",
      HTTP_STATUS.BAD_REQUEST,
    );

  const setting = new Setting({
    ...data,
    effectiveDate: data.effectiveDate ?? now,
    updatedBy: user._id,
  });
  await setting.save();
  await writeAuditLog({
    actorId: user._id,
    action: ENUMS.AUDIT_LOG_ACTION.CREATED_SETTING,
    targetType: ENUMS.AUDIT_LOG_TARGET_TYPE.SETTING,
    targetId: setting._id,
    afterValue: setting,
  });

  return {
    success: true,
    message: "Setting created successfully",
    data: setting,
  };
};

const scheduleChange = async (setting, data, user) => {
  setting.scheduledChanges.push({
    value: data.value,
    effectiveDate: data.effectiveDate,
    updatedBy: user._id,
    at: new Date(),
    reason: data.reason,
  });
  await setting.save();
  await writeAuditLog({
    actorId: user._id,
    action: ENUMS.AUDIT_LOG_ACTION.UPDATE_SETTING,
    targetType: ENUMS.AUDIT_LOG_TARGET_TYPE.SETTING,
    targetId: setting._id,
    beforeValue: { value: setting.value },
    afterValue: {
      scheduledValue: data.value,
      effectiveDate: data.effectiveDate,
      reason: data.reason,
    },
  });

  return {
    success: true,
    message: `Change scheduled. It takes effect on ${data.effectiveDate.toISOString().slice(0, 10)}; the current value stays in use until then.`,
    data: setting,
  };
};

export const updateSetting = async (key, data, user) => {
  await applyDueChanges({ key });
  const setting = await findSettingByKey(key);
  await assertValueUsable(key, setting.dataType, data.value);

  const now = new Date();
  if (data.effectiveDate && data.effectiveDate > now)
    return scheduleChange(setting, data, user);

  const beforeValue = { value: setting.value };
  setting.versionHistory.push({
    value: setting.value,
    updatedBy: user._id,
    at: now,
    reason: data.reason,
  });
  setting.value = data.value;
  setting.updatedBy = user._id;
  setting.effectiveDate = data.effectiveDate ?? now;
  await setting.save();
  await writeAuditLog({
    actorId: user._id,
    action: ENUMS.AUDIT_LOG_ACTION.UPDATE_SETTING,
    targetType: ENUMS.AUDIT_LOG_TARGET_TYPE.SETTING,
    targetId: setting._id,
    beforeValue,
    afterValue: { value: setting.value, reason: data.reason },
  });

  return {
    success: true,
    message: "Setting updated successfully",
    data: setting,
  };
};

export const cancelScheduledChange = async (key, changeId, user) => {
  await applyDueChanges({ key });
  const setting = await findSettingByKey(key);
  const change = setting.scheduledChanges.id(changeId);
  if (!change)
    throw new AppError(
      "That scheduled change was not found (it may already have taken effect)",
      HTTP_STATUS.NOT_FOUND,
    );

  const beforeValue = {
    scheduledValue: change.value,
    effectiveDate: change.effectiveDate,
    reason: change.reason,
  };
  setting.scheduledChanges.pull(changeId);
  await setting.save();
  await writeAuditLog({
    actorId: user._id,
    action: ENUMS.AUDIT_LOG_ACTION.CANCELLED_SETTING_CHANGE,
    targetType: ENUMS.AUDIT_LOG_TARGET_TYPE.SETTING,
    targetId: setting._id,
    beforeValue,
    afterValue: null,
  });

  return {
    success: true,
    message: "Scheduled change cancelled",
    data: setting,
  };
};
