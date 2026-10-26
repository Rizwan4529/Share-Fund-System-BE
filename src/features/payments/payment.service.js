import mongoose from "mongoose";
import { CHECKOUT_SESSION_TTL_MINUTES, ENUMS, HTTP_STATUS } from "#/utils/constants.js";
import { AppError } from "#/utils/appError.js";
import { getFrontendBaseUrl } from "#/utils/emailTemplate.js";
import { getStripe, getWebhookSecret, toMinorUnits } from "#/config/stripe.js";
import { getPublishedLegalDocument } from "#/features/legal-documents/legal-document.service.js";
import LegalAcceptance from "#/features/legal-acceptances/legal-acceptance.model.js";
import Payment from "./payment.model.js";
import { listFundingAccessPlans, resolveCheckoutItem } from "./payment-pricing.js";
import {
  failCheckoutSession,
  failPendingPayment,
  fulfillCheckoutSession,
  recordFailedAttempt,
} from "./payment-fulfillment.js";
import { retryMissingReceipt, sendPaymentReceipt } from "./payment-receipt.js";
import { writeAuditLog } from "#/features/audit-logs/audit-log.service.js";

const STATUS = ENUMS.PAYMENT_STATUS;
const CODE = ENUMS.PAYMENT_ERROR_CODE;

// Never exposed to participants.
const HIDDEN_FIELDS = "-checkoutSessionId -__v";

const paymentError = (message, status, code, extra = {}) =>
  new AppError(message, status, [{ code, ...extra }]);

/** Stripe API failures surface as a clean 502 instead of a raw 500. */
const callStripe = async (operation) => {
  try {
    return await operation(getStripe());
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error("Stripe API call failed:", error.message);
    throw new AppError(
      "The payment provider is unavailable right now. Please try again.",
      HTTP_STATUS.BAD_GATEWAY,
    );
  }
};

const getCheckoutAcknowledgment = () =>
  getPublishedLegalDocument(ENUMS.LEGAL_DOCUMENT_TYPE.CHECKOUT_ACKNOWLEDGMENT);

/** Frontend success/cancel pages; FRONTEND_BASE_URL is required. */
const checkoutReturnUrls = (paymentId) => {
  const base = getFrontendBaseUrl();
  if (!base)
    throw new AppError(
      "Payments are not configured (FRONTEND_BASE_URL is missing)",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
    );
  return {
    success_url: `${base}payments/success?paymentId=${paymentId}`,
    cancel_url: `${base}payments/cancel?paymentId=${paymentId}`,
  };
};

/**
 * Expire this user's other open sessions for the same item so an old tab
 * can't be paid alongside the new one (double-charge guard).
 */
const supersedePendingPayments = async (user, purpose, referenceId) => {
  const pending = await Payment.find({
    userId: user._id,
    purpose,
    referenceId,
    status: STATUS.PENDING,
  });
  for (const payment of pending) {
    if (payment.checkoutSessionId) {
      const session = await callStripe((stripe) =>
        stripe.checkout.sessions.retrieve(payment.checkoutSessionId),
      );
      if (session.status === "complete")
        throw paymentError(
          "A payment for this is already being confirmed. Check your payment history shortly.",
          HTTP_STATUS.CONFLICT,
          CODE.ALREADY_PAID,
        );
      if (session.status === "open")
        await callStripe((stripe) =>
          stripe.checkout.sessions.expire(payment.checkoutSessionId),
        );
    }
    await failPendingPayment(payment._id, "Superseded by a newer checkout");
  }
};

export const getQuote = async ({ purpose, referenceId }, user) => {
  const item = await resolveCheckoutItem(purpose, referenceId, user);
  return {
    success: true,
    message: "Checkout amount resolved",
    data: { purpose, referenceId, ...item },
  };
};

export const getFundingAccessPlans = async () => ({
  success: true,
  message: "Funding Access plans retrieved successfully",
  data: await listFundingAccessPlans(),
});

export const createCheckoutSession = async (
  { purpose, referenceId, acknowledgmentVersion },
  user,
) => {
  if (!user.emailVerified)
    throw paymentError(
      "Verify your email address before making a payment.",
      HTTP_STATUS.FORBIDDEN,
      CODE.EMAIL_NOT_VERIFIED,
    );

  // The participant accepts the checkout acknowledgment as part of this call;
  // the version they saw must be the one currently published.
  const acknowledgment = await getCheckoutAcknowledgment();
  if (acknowledgmentVersion == null)
    throw paymentError(
      "Please read and accept the checkout acknowledgment.",
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
      CODE.ACKNOWLEDGMENT_REQUIRED,
      { currentVersion: acknowledgment.version },
    );
  if (acknowledgmentVersion !== acknowledgment.version)
    throw paymentError(
      "The checkout acknowledgment was updated. Please review and accept the latest version.",
      HTTP_STATUS.CONFLICT,
      CODE.ACKNOWLEDGMENT_OUTDATED,
      { currentVersion: acknowledgment.version },
    );

  // Server-resolved amount — the client never sends one.
  const item = await resolveCheckoutItem(purpose, referenceId, user);
  await supersedePendingPayments(user, purpose, referenceId);

  const acceptance = await LegalAcceptance.create({
    userId: user._id,
    legalDocumentId: acknowledgment._id,
    documentType: acknowledgment.documentType,
    documentVersion: acknowledgment.version,
    context: ENUMS.LEGAL_ACCEPTANCE_CONTEXT.CHECKOUT,
  });

  // The server record exists BEFORE the participant is sent to Stripe.
  const payment = await Payment.create({
    _id: new mongoose.Types.ObjectId(),
    userId: user._id,
    purpose,
    referenceId,
    description: item.description,
    amount: item.amount,
    currency: item.currency,
    status: STATUS.PENDING,
    legalAcceptanceId: acceptance._id,
  });
  const metadata = {
    paymentId: String(payment._id),
    userId: String(user._id),
    purpose,
    referenceId,
  };

  let session;
  try {
    session = await getStripe().checkout.sessions.create(
      {
        mode: "payment",
        client_reference_id: String(payment._id),
        customer_email: user.email,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: item.currency.toLowerCase(),
              unit_amount: toMinorUnits(item.amount, item.currency),
              product_data: { name: item.description },
            },
          },
        ],
        metadata,
        payment_intent_data: { metadata },
        // Charge in the currency the app shows and records (no automatic
        // local-currency conversion), so receipts match the card statement.
        adaptive_pricing: { enabled: false },
        // Abandoned/declined checkouts settle (expired webhook) within this.
        expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_SESSION_TTL_MINUTES * 60,
        ...checkoutReturnUrls(payment._id),
      },
      { idempotencyKey: `checkout-session-${payment._id}` },
    );
  } catch (error) {
    await Payment.updateOne(
      { _id: payment._id },
      { $set: { status: STATUS.FAILED, failureReason: "Could not start Stripe checkout" } },
    );
    if (error instanceof AppError) throw error;
    console.error("Stripe checkout session failed:", error.message);
    throw new AppError(
      "We couldn't start checkout right now. Please try again.",
      HTTP_STATUS.BAD_GATEWAY,
    );
  }

  await Payment.updateOne(
    { _id: payment._id },
    { $set: { checkoutSessionId: session.id } },
  );

  return {
    success: true,
    message: "Checkout session created",
    data: {
      paymentId: payment._id,
      sessionId: session.id,
      url: session.url,
      amount: item.amount,
      currency: item.currency,
      description: item.description,
    },
  };
};

/**
 * Stripe webhook — the source of truth. `rawBody` must be the unparsed
 * request body for the signature check. Handlers are safe to re-run.
 */
export const handleStripeWebhook = async (rawBody, signature) => {
  let event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, getWebhookSecret());
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(`Webhook signature verification failed`, HTTP_STATUS.BAD_REQUEST);
  }

  const session = event.data.object;
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      // "unpaid" = delayed methods (bank debits): wait for async_payment_*.
      if (session.payment_status === "paid") await fulfillCheckoutSession(session);
      break;
    case "checkout.session.async_payment_failed":
      await failCheckoutSession(session, "Payment failed");
      break;
    case "checkout.session.expired":
      await failCheckoutSession(session, "Checkout session expired");
      break;
    case "payment_intent.payment_failed":
      // A declined card; the checkout stays open for another try.
      await recordFailedAttempt(event.data.object);
      break;
    default:
      break; // not an event we act on
  }
  return { received: true };
};

export const listMyPayments = async (user) => {
  const payments = await Payment.find({ userId: user._id })
    .select(HIDDEN_FIELDS)
    .sort({ createdAt: -1 })
    .lean();
  return {
    success: true,
    message: "Payments retrieved successfully",
    data: payments,
  };
};

const findOwnedPayment = async (id, user) => {
  const payment = await Payment.findOne({ _id: id, userId: user._id }).select(HIDDEN_FIELDS);
  if (!payment) throw new AppError("Payment not found", HTTP_STATUS.NOT_FOUND);
  return payment;
};

/**
 * Safety net for a late or misconfigured webhook: while a payment is still
 * pending, ask Stripe directly (server-side, with our secret key) and run the
 * SAME idempotent, amount-checked fulfilment the webhook would. The client's
 * redirect is never trusted — only Stripe's own answer.
 */
const reconcilePendingPayment = async (id) => {
  const record = await Payment.findById(id).select("status checkoutSessionId").lean();
  if (record?.status !== STATUS.PENDING || !record.checkoutSessionId) return;
  try {
    const session = await getStripe().checkout.sessions.retrieve(record.checkoutSessionId);
    if (session.status === "complete" && session.payment_status === "paid") {
      await fulfillCheckoutSession(session);
    } else if (session.status === "expired") {
      await failCheckoutSession(session, "Checkout session expired");
    }
  } catch (error) {
    // Never break the read; the webhook (or the next poll) will settle it.
    console.error(`Stripe reconcile failed for payment ${id}:`, error.message);
  }
};

export const getMyPayment = async (id, user) => {
  // Refund/dispute fields are included but inactive until the refunds milestone.
  // TODO(refunds): refund requests + processing.
  await findOwnedPayment(id, user); // ownership check first
  await reconcilePendingPayment(id);
  await retryMissingReceipt(await Payment.findById(id).lean());
  const payment = await findOwnedPayment(id, user);
  return {
    success: true,
    message: "Payment retrieved successfully",
    data: payment,
  };
};

/** Participant left Stripe without paying: close the session right away. */
export const cancelMyPayment = async (id, user) => {
  const payment = await findOwnedPayment(id, user);
  if (payment.status === STATUS.PENDING) {
    const checkoutSessionId = (await Payment.findById(id).select("checkoutSessionId").lean())
      ?.checkoutSessionId;
    let stillPayable = true;
    if (checkoutSessionId) {
      const session = await callStripe((stripe) =>
        stripe.checkout.sessions.retrieve(checkoutSessionId),
      );
      // Paid but the webhook hasn't landed yet — leave it for the webhook.
      if (session.status === "complete") stillPayable = false;
      else if (session.status === "open")
        await callStripe((stripe) => stripe.checkout.sessions.expire(checkoutSessionId));
    }
    if (stillPayable) await failPendingPayment(id, "Checkout canceled");
  }
  return getMyPayment(id, user);
};

/** Admin: send a completed payment's receipt again (audited). */
export const resendReceiptByAdmin = async (id, admin) => {
  const payment = await Payment.findById(id);
  if (!payment) throw new AppError("Payment not found", HTTP_STATUS.NOT_FOUND);
  if (payment.status !== STATUS.COMPLETED)
    throw new AppError("Only completed payments have a receipt.", HTTP_STATUS.UNPROCESSABLE_ENTITY);
  const sent = await sendPaymentReceipt(payment);
  await writeAuditLog({
    actorId: admin._id,
    action: ENUMS.AUDIT_LOG_ACTION.RESENT_PAYMENT_RECEIPT,
    targetType: ENUMS.AUDIT_LOG_TARGET_TYPE.PAYMENT,
    targetId: payment._id,
    afterValue: { sent },
  });
  if (!sent)
    throw new AppError(
      "The receipt email couldn't be sent right now. Please try again shortly.",
      HTTP_STATUS.BAD_GATEWAY,
    );
  return {
    success: true,
    message: "Receipt sent",
    data: await Payment.findById(id).select("receiptRef receiptAttemptedAt").lean(),
  };
};
