import { HTTP_STATUS } from "#/utils/constants.js";
import * as recommendationService from "./recommendation.service.js";
import * as reviewService from "./recommendation-review.service.js";

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

export const selectActivationOption = async (req, res) => {
  const response = await recommendationService.selectOptionForSelection(
    req.params.selectionId,
    req.body.option,
    req.user,
  );
  return res.status(HTTP_STATUS.OK).json(response);
};

/* --- Admin review --- */

export const listRecommendationsForReview = async (req, res) => {
  const response = await reviewService.listForReview(req.validatedQuery);
  return res.status(HTTP_STATUS.OK).json(response);
};

export const getRecommendationForReview = async (req, res) => {
  const response = await reviewService.getReviewDetail(req.params.id);
  return res.status(HTTP_STATUS.OK).json(response);
};

export const approveRecommendation = async (req, res) => {
  const response = await reviewService.approveRecommendation(
    req.params.id,
    req.user,
  );
  return res.status(HTTP_STATUS.OK).json(response);
};

export const adjustRecommendation = async (req, res) => {
  const response = await reviewService.adjustRecommendation(
    req.params.id,
    req.body,
    req.user,
  );
  return res.status(HTTP_STATUS.OK).json(response);
};

export const resetRecommendation = async (req, res) => {
  const response = await reviewService.resetRecommendation(
    req.params.id,
    req.body,
    req.user,
  );
  return res.status(HTTP_STATUS.OK).json(response);
};
