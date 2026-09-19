import { HTTP_STATUS } from "#/utils/constants.js";
import * as waitlistService from "./waitlist.service.js";

export const listWaitlistEntries = async (req, res) => {
  const response = await waitlistService.listWaitlistEntries(req.query);
  return res.status(HTTP_STATUS.OK).json(response);
};

export const getWaitlistEntryById = async (req, res) => {
  const response = await waitlistService.getWaitlistEntryById(req.params.id);
  return res.status(HTTP_STATUS.OK).json(response);
};

export const createWaitlistEntry = async (req, res) => {
  const response = await waitlistService.createWaitlistEntry(req.body);
  return res.status(HTTP_STATUS.CREATED).json(response);
};

export const updateWaitlistEntry = async (req, res) => {
  const response = await waitlistService.updateWaitlistEntry(
    req.params.id,
    req.body,
    req.user,
  );
  return res.status(HTTP_STATUS.OK).json(response);
};

export const deleteWaitlistEntry = async (req, res) => {
  const response = await waitlistService.deleteWaitlistEntry(
    req.params.id,
    req.user,
  );
  return res.status(HTTP_STATUS.OK).json(response);
};
