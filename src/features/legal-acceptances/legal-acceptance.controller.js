import { HTTP_STATUS } from "#/utils/constants.js";
import * as legalAcceptanceService from "./legal-acceptance.service.js";

export const recordLegalAcceptance = async (req, res) => {
  const response = await legalAcceptanceService.recordLegalAcceptance(
    req.body,
    req.user,
  );
  return res.status(HTTP_STATUS.CREATED).json(response);
};

export const getMyLegalAcceptances = async (req, res) => {
  const response = await legalAcceptanceService.getMyLegalAcceptances(req.user);
  return res.status(HTTP_STATUS.OK).json(response);
};

export const getUserLegalAcceptances = async (req, res) => {
  const response = await legalAcceptanceService.getUserLegalAcceptances(
    req.params.userId,
  );
  return res.status(HTTP_STATUS.OK).json(response);
};

export const checkMyCurrentAcceptance = async (req, res) => {
  const response = await legalAcceptanceService.checkMyCurrentAcceptance(
    req.params.documentType,
    req.user,
  );
  return res.status(HTTP_STATUS.OK).json(response);
};

export const checkUserCurrentAcceptance = async (req, res) => {
  const response = await legalAcceptanceService.checkUserCurrentAcceptance(
    req.params.userId,
    req.params.documentType,
  );
  return res.status(HTTP_STATUS.OK).json(response);
};
