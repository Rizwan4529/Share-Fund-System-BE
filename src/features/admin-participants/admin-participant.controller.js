import { HTTP_STATUS } from "#/utils/constants.js";
import * as adminParticipantService from "./admin-participant.service.js";

export const listParticipants = async (req, res) => {
  const response = await adminParticipantService.listParticipants(
    req.validatedQuery,
  );
  return res.status(HTTP_STATUS.OK).json(response);
};

export const getParticipantById = async (req, res) => {
  const response = await adminParticipantService.getParticipantById(
    req.params.userId,
  );
  return res.status(HTTP_STATUS.OK).json(response);
};

export const updateParticipantStatus = async (req, res) => {
  const response = await adminParticipantService.updateParticipantStatus(
    req.params.userId,
    req.body,
    req.user,
  );
  return res.status(HTTP_STATUS.OK).json(response);
};

export const updateParticipantAccess = async (req, res) => {
  const response = await adminParticipantService.updateParticipantAccess(
    req.params.userId,
    req.body,
    req.user,
  );
  return res.status(HTTP_STATUS.OK).json(response);
};
