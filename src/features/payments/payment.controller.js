import { HTTP_STATUS } from "#/utils/constants.js";
import * as paymentService from "./payment.service.js";

export const getQuote = async (req, res) => {
  const response = await paymentService.getQuote(req.body, req.user);
  return res.status(HTTP_STATUS.OK).json(response);
};

export const getFundingAccessPlans = async (req, res) => {
  const response = await paymentService.getFundingAccessPlans();
  return res.status(HTTP_STATUS.OK).json(response);
};

export const createCheckoutSession = async (req, res) => {
  const response = await paymentService.createCheckoutSession(req.body, req.user);
  return res.status(HTTP_STATUS.CREATED).json(response);
};

/** Mounted with express.raw — req.body is the raw Buffer Stripe signed. */
export const stripeWebhook = async (req, res) => {
  const response = await paymentService.handleStripeWebhook(
    req.body,
    req.headers["stripe-signature"],
  );
  return res.status(HTTP_STATUS.OK).json(response);
};

export const listMyPayments = async (req, res) => {
  const response = await paymentService.listMyPayments(req.user);
  return res.status(HTTP_STATUS.OK).json(response);
};

export const getMyPayment = async (req, res) => {
  const response = await paymentService.getMyPayment(req.params.id, req.user);
  return res.status(HTTP_STATUS.OK).json(response);
};

export const cancelMyPayment = async (req, res) => {
  const response = await paymentService.cancelMyPayment(req.params.id, req.user);
  return res.status(HTTP_STATUS.OK).json(response);
};
