import { HTTP_STATUS } from "#/utils/constants.js";
import * as successProfileService from "./success-profile.service.js";

export const getMySuccessProfile = async (req, res) => {
  const response = await successProfileService.getMySuccessProfile(req.user);
  return res.status(HTTP_STATUS.OK).json(response);
};

export const upsertMySuccessProfile = async (req, res) => {
  const { created, response } =
    await successProfileService.upsertMySuccessProfile(req.body, req.user);
  return res
    .status(created ? HTTP_STATUS.CREATED : HTTP_STATUS.OK)
    .json(response);
};

export const updateMySuccessProfile = async (req, res) => {
  const response = await successProfileService.updateMySuccessProfile(
    req.body,
    req.user,
  );
  return res.status(HTTP_STATUS.OK).json(response);
};

export const completeMySuccessProfile = async (req, res) => {
  const response = await successProfileService.completeMySuccessProfile(
    req.body,
    req.user,
  );
  return res.status(HTTP_STATUS.OK).json(response);
};
