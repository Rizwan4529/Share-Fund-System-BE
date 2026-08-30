import { HTTP_STATUS } from "#/utils/constants.js";
import * as settingCategoryService from "./setting-category.service.js";

export const listSettingCategories = async (req, res) => {
  const response = await settingCategoryService.listSettingCategories();
  return res.status(HTTP_STATUS.OK).json(response);
};

export const createSettingCategory = async (req, res) => {
  const response = await settingCategoryService.createSettingCategory(
    req.body,
    req.user,
  );
  return res.status(HTTP_STATUS.CREATED).json(response);
};

export const updateSettingCategory = async (req, res) => {
  const response = await settingCategoryService.updateSettingCategory(
    req.params.id,
    req.body,
    req.user,
  );
  return res.status(HTTP_STATUS.OK).json(response);
};

export const deleteSettingCategory = async (req, res) => {
  const response = await settingCategoryService.deleteSettingCategory(
    req.params.id,
    req.user,
  );
  return res.status(HTTP_STATUS.OK).json(response);
};
