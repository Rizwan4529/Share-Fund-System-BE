import { HTTP_STATUS } from "#/utils/constants.js";
import * as adminReportService from "./admin-report.service.js";
import { getOverview as getOverviewMetrics } from "./admin-overview.service.js";
import { resendReceiptByAdmin } from "#/features/payments/payment.service.js";

export const listEnrollments = async (req, res) => {
  const response = await adminReportService.listEnrollments(req.validatedQuery);
  return res.status(HTTP_STATUS.OK).json(response);
};

export const listPayments = async (req, res) => {
  const response = await adminReportService.listPayments(req.validatedQuery);
  return res.status(HTTP_STATUS.OK).json(response);
};

export const getPayment = async (req, res) => {
  const response = await adminReportService.getPayment(req.params.id);
  return res.status(HTTP_STATUS.OK).json(response);
};

export const getRevenueSummary = async (req, res) => {
  const response = await adminReportService.getRevenueSummary(req.validatedQuery);
  return res.status(HTTP_STATUS.OK).json(response);
};

export const getOverview = async (req, res) => {
  const response = await getOverviewMetrics(req.validatedQuery);
  return res.status(HTTP_STATUS.OK).json(response);
};

export const resendPaymentReceipt = async (req, res) => {
  const response = await resendReceiptByAdmin(req.params.id, req.user);
  return res.status(HTTP_STATUS.OK).json(response);
};
