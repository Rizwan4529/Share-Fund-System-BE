import { HTTP_STATUS } from "#/utils/constants.js";
import * as successCenterProgramService from "./success-center-program.service.js";

export const listSuccessCenterPrograms = async (req, res) => {
  const response =
    await successCenterProgramService.listSuccessCenterPrograms(req.query);
  return res.status(HTTP_STATUS.OK).json(response);
};

export const getSuccessCenterProgramById = async (req, res) => {
  const response =
    await successCenterProgramService.getSuccessCenterProgramById(
      req.params.id,
    );
  return res.status(HTTP_STATUS.OK).json(response);
};

export const createSuccessCenterProgram = async (req, res) => {
  const response =
    await successCenterProgramService.createSuccessCenterProgram(
      req.body,
      req.user,
    );
  return res.status(HTTP_STATUS.CREATED).json(response);
};

export const updateSuccessCenterProgram = async (req, res) => {
  const response =
    await successCenterProgramService.updateSuccessCenterProgram(
      req.params.id,
      req.body,
      req.user,
    );
  return res.status(HTTP_STATUS.OK).json(response);
};

export const deleteSuccessCenterProgram = async (req, res) => {
  const response =
    await successCenterProgramService.deleteSuccessCenterProgram(
      req.params.id,
      req.user,
    );
  return res.status(HTTP_STATUS.OK).json(response);
};
