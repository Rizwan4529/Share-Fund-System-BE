import { HTTP_STATUS } from "#/utils/constants.js";
import * as selectionService from "./success-center-selection.service.js";

export const createSelection = async (req, res) => {
  const response = await selectionService.createSelection(req.body, req.user);
  return res.status(HTTP_STATUS.CREATED).json(response);
};

export const listMySelections = async (req, res) => {
  const response = await selectionService.listMySelections(
    req.user,
    req.validatedQuery,
  );
  return res.status(HTTP_STATUS.OK).json(response);
};

export const removeSelection = async (req, res) => {
  const response = await selectionService.removeSelection(
    req.params.id,
    req.user,
  );
  return res.status(HTTP_STATUS.OK).json(response);
};

export const updateSelectionGoal = async (req, res) => {
  const response = await selectionService.updateSelectionGoal(
    req.params.id,
    req.body,
    req.user,
  );
  return res.status(HTTP_STATUS.OK).json(response);
};
