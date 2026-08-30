import { ENUMS, HTTP_STATUS } from "#/utils/constants.js";
import { AppError } from "#/utils/appError.js";
import Setting from "./setting.model.js";
import { writeAuditLog } from "#/features/audit-logs/audit-log.service.js";

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

const findSettingByKey = async (key) => {
  const setting = await Setting.findOne({ key });
  if (!setting)
    throw new AppError(`Setting '${key}' not found`, HTTP_STATUS.NOT_FOUND);
  return setting;
};

export const getSetting = async (key) => {
  const setting = await findSettingByKey(key);
  return setting.value;
};

export const getSettingByKey = async (key) => {
  const setting = await findSettingByKey(key);
  return {
    success: true,
    message: "Setting retrieved successfully",
    data: setting,
  };
};

export const getSettingsByCategory = async (category) => {
  const settings = await Setting.find({ category }).sort({ key: 1 });
  return {
    success: true,
    message: "Settings retrieved successfully",
    data: settings,
  };
};

export const listSettings = async () => {
  const settings = await Setting.find().sort({ category: 1, key: 1 });
  return {
    success: true,
    message: "Settings retrieved successfully",
    data: settings,
  };
};

export const insertSettings = async (data, user) => {
  assertValueMatchesDataType(data.value, data.dataType);

  const setting = new Setting({
    ...data,
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

export const updateSetting = async (key, data, user) => {
  const setting = await findSettingByKey(key);
  assertValueMatchesDataType(data.value, setting.dataType);

  const beforeValue = { value: setting.value };
  setting.versionHistory.push({
    value: setting.value,
    updatedBy: user._id,
    at: new Date(),
    reason: data.reason,
  });
  setting.value = data.value;
  setting.updatedBy = user._id;
  if (data.effectiveDate !== undefined) {
    setting.effectiveDate = data.effectiveDate;
  }
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
