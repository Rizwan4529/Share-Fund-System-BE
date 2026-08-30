import { HTTP_STATUS } from "#/utils/constants.js";
import * as auditLogService from "./audit-log.service.js";

export const listAuditLogs = async (req, res) => {
  const response = await auditLogService.listAuditLogs(req.query);
  return res.status(HTTP_STATUS.OK).json(response);
};
