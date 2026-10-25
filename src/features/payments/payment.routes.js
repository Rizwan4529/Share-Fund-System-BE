import express from "express";
import { validate, validateParams } from "#/middleware/validate.middleware.js";
import { authenticate } from "#/middleware/auth.middleware.js";
import {
  createCheckoutSessionSchema,
  paymentIdParamSchema,
  quoteSchema,
} from "./payment.validator.js";
import {
  cancelMyPayment,
  createCheckoutSession,
  getFundingAccessPlans,
  getMyPayment,
  getQuote,
  listMyPayments,
} from "./payment.controller.js";

// NOTE: POST /webhook is mounted separately in app.js, BEFORE express.json(),
// because Stripe's signature check needs the raw body.

const router = express.Router();
router.use(authenticate);

router.get("/funding-access-plans", getFundingAccessPlans);
router.post("/quote", validate(quoteSchema), getQuote);
router.post(
  "/create-checkout-session",
  validate(createCheckoutSessionSchema),
  createCheckoutSession,
);
router.get("/me", listMyPayments);
router.get("/:id", validateParams(paymentIdParamSchema), getMyPayment);
router.post("/:id/cancel", validateParams(paymentIdParamSchema), cancelMyPayment);

export default router;
