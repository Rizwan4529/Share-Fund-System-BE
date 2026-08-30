import { HTTP_STATUS } from "#/utils/constants.js";
import * as successCenterProgramService from "./success-center-program.service.js";

export const listSuccessCenterPrograms = async (req, res) => {
  const response =
    await successCenterProgramService.listSuccessCenterPrograms();
  return res.status(HTTP_STATUS.OK).json(response);
};
