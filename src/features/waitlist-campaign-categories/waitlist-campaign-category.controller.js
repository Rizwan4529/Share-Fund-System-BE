import { ENUMS, HTTP_STATUS } from "#/utils/constants.js";
import * as waitlistCampaignCategoryService from "./waitlist-campaign-category.service.js";

export const listWaitlistCampaignCategories = async (req, res) => {
  const includeInactive =
    req.user?.role === ENUMS.ROLES.ADMIN &&
    req.query.includeInactive === "true";
  const response =
    await waitlistCampaignCategoryService.listWaitlistCampaignCategories({
      includeInactive,
    });
  return res.status(HTTP_STATUS.OK).json(response);
};

export const getWaitlistCampaignCategoryById = async (req, res) => {
  const response =
    await waitlistCampaignCategoryService.getWaitlistCampaignCategoryById(
      req.params.id,
    );
  return res.status(HTTP_STATUS.OK).json(response);
};

export const createWaitlistCampaignCategory = async (req, res) => {
  const response =
    await waitlistCampaignCategoryService.createWaitlistCampaignCategory(
      req.body,
      req.user,
    );
  return res.status(HTTP_STATUS.CREATED).json(response);
};

export const updateWaitlistCampaignCategory = async (req, res) => {
  const response =
    await waitlistCampaignCategoryService.updateWaitlistCampaignCategory(
      req.params.id,
      req.body,
      req.user,
    );
  return res.status(HTTP_STATUS.OK).json(response);
};

export const deleteWaitlistCampaignCategory = async (req, res) => {
  const response =
    await waitlistCampaignCategoryService.deleteWaitlistCampaignCategory(
      req.params.id,
      req.user,
    );
  return res.status(HTTP_STATUS.OK).json(response);
};
