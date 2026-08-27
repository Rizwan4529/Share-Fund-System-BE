import { HTTP_STATUS } from "#/utils/constants.js";
import * as userService from "./user.service.js";

export const loginUser = async (req, res) => {
  const response = await userService.loginUser(req.body);
  return res.status(HTTP_STATUS.OK).json(response);
};

export const registerUser = async (req, res) => {
  const response = await userService.registerUser(req.body);
  return res.status(HTTP_STATUS.CREATED).json(response);
};

export const verifyEmail = async (req, res) => {
  const response = await userService.verifyEmail(req.body);
  res.status(HTTP_STATUS.OK).json(response);
};

export const resendVerificationLink = async (req, res) => {
  //TODO impliment the check where the user cant send more than 5 emails within 5 mins or So
  const response = await userService.resendVerificationLink(req.body);

  return res.status(HTTP_STATUS.OK).json(response);
};
