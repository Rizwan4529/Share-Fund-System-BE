import { HTTP_STATUS } from "#/utils/constants.js";
import * as settingService from "./setting.service.js";

export const insertSettings = async (req, res) => {
  const response = await settingService.insertSettings(req.body, req.user);
  return res.status(HTTP_STATUS.CREATED).json(response);
};

export const getSettingByKey = async (req, res) => {
  const response = await settingService.getSettingByKey(req.params.key);
  return res.status(HTTP_STATUS.OK).json(response);
};

export const getSettingsByCategory = async (req, res) => {
  const response = await settingService.getSettingsByCategory(
    req.params.category,
  );
  return res.status(HTTP_STATUS.OK).json(response);
};

export const listSettings = async (req, res) => {
  const response = await settingService.listSettings();
  return res.status(HTTP_STATUS.OK).json(response);
};

export const updateSetting = async (req, res) => {
  const response = await settingService.updateSetting(
    req.params.key,
    req.body,
    req.user,
  );
  return res.status(HTTP_STATUS.OK).json(response);
};
