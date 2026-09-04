import { HTTP_STATUS } from "#/utils/constants.js";
import * as successCenterCategoryService from "./success-center-category.service.js";

export const listSuccessCenterCategories = async (req, res) => {
  const response =
    await successCenterCategoryService.listSuccessCenterCategories();
  return res.status(HTTP_STATUS.OK).json(response);
};

export const getSuccessCenterCategoryById = async (req, res) => {
  const response =
    await successCenterCategoryService.getSuccessCenterCategoryById(
      req.params.id,
    );
  return res.status(HTTP_STATUS.OK).json(response);
};

export const createSuccessCenterCategory = async (req, res) => {
  const response =
    await successCenterCategoryService.createSuccessCenterCategory(
      req.body,
      req.user,
    );
  return res.status(HTTP_STATUS.CREATED).json(response);
};

export const updateSuccessCenterCategory = async (req, res) => {
  const response =
    await successCenterCategoryService.updateSuccessCenterCategory(
      req.params.id,
      req.body,
      req.user,
    );
  return res.status(HTTP_STATUS.OK).json(response);
};

export const deleteSuccessCenterCategory = async (req, res) => {
  const response =
    await successCenterCategoryService.deleteSuccessCenterCategory(
      req.params.id,
      req.user,
    );
  return res.status(HTTP_STATUS.OK).json(response);
};
