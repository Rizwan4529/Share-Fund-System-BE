import { HTTP_STATUS } from "#/utils/constants.js";
import * as userService from "./user.service.js";

export const loginUser = async (req, res) => {
  const response = await userService.loginUser(req.body);
  return res.status(HTTP_STATUS.OK).json(response);
};

export const logoutUser = async (req, res) => {
  const response = await userService.logoutUser(req.user);
  return res.status(HTTP_STATUS.OK).json(response);
};

export const registerUser = async (req, res) => {
  const response = await userService.registerUser(req.body);
  return res.status(HTTP_STATUS.CREATED).json(response);
};

export const registerAdmin = async (req, res) => {
  const response = await userService.registerAdmin(req.body, req.user);
  return res.status(HTTP_STATUS.CREATED).json(response);
};

export const verifyEmail = async (req, res) => {
  const response = await userService.verifyEmail(req.body);
  res.status(HTTP_STATUS.OK).json(response);
};

export const resendVerificationLink = async (req, res) => {
  const response = await userService.resendVerificationLink(req.body);
  return res.status(HTTP_STATUS.OK).json(response);
};
