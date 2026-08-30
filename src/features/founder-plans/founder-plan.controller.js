import { HTTP_STATUS } from "#/utils/constants.js";
import * as founderPlanService from "./founder-plan.service.js";

export const listFounderPlans = async (req, res) => {
  const response = await founderPlanService.listFounderPlans(req.user);
  return res.status(HTTP_STATUS.OK).json(response);
};

export const getFounderPlanById = async (req, res) => {
  const response = await founderPlanService.getFounderPlanById(
    req.params.id,
    req.user,
  );
  return res.status(HTTP_STATUS.OK).json(response);
};

export const createFounderPlan = async (req, res) => {
  const response = await founderPlanService.createFounderPlan(
    req.body,
    req.user,
  );
  return res.status(HTTP_STATUS.CREATED).json(response);
};

export const updateFounderPlan = async (req, res) => {
  const response = await founderPlanService.updateFounderPlan(
    req.params.id,
    req.body,
    req.user,
  );
  return res.status(HTTP_STATUS.OK).json(response);
};

export const toggleFounderPlanAvailability = async (req, res) => {
  const response = await founderPlanService.toggleFounderPlanAvailability(
    req.params.id,
    req.body,
    req.user,
  );
  return res.status(HTTP_STATUS.OK).json(response);
};
