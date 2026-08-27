import { HTTP_STATUS } from "#/utils/constants.js";
import * as settingService from "./setting.controller.js";
export const insertSettings = async (req, res) => {
  const response = await settingService.insertSettings(res.body);
  return res.status(HTTP_STATUS.CREATED).json(response);
};
