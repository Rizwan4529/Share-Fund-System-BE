import { HTTP_STATUS } from "#/utils/constants.js";
import * as recommendationService from "./recommendation.service.js";

export const calculateActivation = async (req, res) => {
  const response = await recommendationService.calculateForSelection(
    req.body.selectionId,
    req.user,
  );
  return res.status(HTTP_STATUS.OK).json(response);
};

export const getActivationForSelection = async (req, res) => {
  const response = await recommendationService.getForSelection(
    req.params.selectionId,
    req.user,
  );
  return res.status(HTTP_STATUS.OK).json(response);
};

export const getActivationForSelectionAsAdmin = async (req, res) => {
  const response = await recommendationService.getForSelectionAsAdmin(
    req.params.selectionId,
  );
  return res.status(HTTP_STATUS.OK).json(response);
};
