import { HTTP_STATUS } from "#/utils/constants.js";
import * as successCenterService from "./success-center.service.js";

export const listCategories = async (req, res) => {
  const response = await successCenterService.listCategories();
  return res.status(HTTP_STATUS.OK).json(response);
};

export const listCategoryPrograms = async (req, res) => {
  const response = await successCenterService.listCategoryPrograms(
    req.params.categoryId,
  );
  return res.status(HTTP_STATUS.OK).json(response);
};

export const getProgram = async (req, res) => {
  const response = await successCenterService.getProgram(req.params.programId);
  return res.status(HTTP_STATUS.OK).json(response);
};
