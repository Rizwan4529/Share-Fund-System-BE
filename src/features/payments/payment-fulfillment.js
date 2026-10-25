import mongoose from "mongoose";
import { ENUMS } from "#/utils/constants.js";
import { toMinorUnits } from "#/config/stripe.js";
import { writeAuditLog } from "#/features/audit-logs/audit-log.service.js";
import { getPublishedLegalDocument } from "#/features/legal-documents/legal-document.service.js";
import LegalAcceptance from "#/features/legal-acceptances/legal-acceptance.model.js";
import FounderPlan from "#/features/founder-plans/founder-plan.model.js";
import FounderPurchase from "#/features/founder-purchases/founder-purchase.model.js";
import SuccessCenterSelection from "#/features/success-center-selections/success-center-selection.model.js";
import User from "#/features/users/user.model.js";
import Payment from "./payment.model.js";
import { findFundingAccessPlan } from "./payment-pricing.js";
import { sendPaymentReceipt } from "./payment-receipt.js";

/*
 * Webhook-only fulfilment — the ONLY code that activates access.
 *
 * Safety model:
 *  - Every step is idempotent (keyed by the payment), so a re-delivered or
 *    concurrent duplicate event can't double-activate or double-record.
 *  - Activation runs BEFORE the payment is flipped to "completed", and that
 *    flip is a conditional update — exactly one delivery "wins" it and only
 *    that one sends the receipt / writes the audit log.
 *  - If any step throws, the webhook returns 500 and Stripe retries; the
 *    re-run skips what's already done. With a replica set (e.g. Atlas) all
 *    steps also run in one transaction.
 */

const PURPOSE = ENUMS.PAYMENT_PURPOSE;
const STATUS = ENUMS.PAYMENT_STATUS;

let transactionsSupported;
const supportsTransactions = async () => {
  if (transactionsSupported === undefined) {
    const hello = await mongoose.connection.db.admin().command({ hello: 1 });
    transactionsSupported = Boolean(hello.setName || hello.msg === "isdbgrid");
  }
  return transactionsSupported;
};

/** Runs `work(session)` in a transaction when the deployment supports one. */
const withOptionalTransaction = async (work) => {
  if (!(await supportsTransactions())) return work(null);
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
};

/** One purchase per payment; a concurrent duplicate insert falls back to a read. */
const upsertPurchase = async (payment, fields, session) => {
  const filter = { paymentId: payment._id };
  const update = {
    $setOnInsert: {
      ...fields,
      userId: payment.userId,
      paymentId: payment._id,
      activationStatus: ENUMS.FOUNDER_PURCHASE_ACTIVATION_STATUS.COMPLETED,
      purchasedAt: new Date(),
    },
  };
  try {
    return await FounderPurchase.findOneAndUpdate(filter, update, {
      upsert: true,
      new: true,
      session,
    });
  } catch (err) {
    if (err.code !== 11000) throw err;
    return FounderPurchase.findOne(filter).session(session);
  }
};

/** Purpose-specific activation. Returns { purchaseId?, duplicateOf? }. */
const activate = async (payment, session) => {
  if (payment.purpose === PURPOSE.FUNDING_ACCESS) {
    const plan = await findFundingAccessPlan(payment.referenceId);
    const purchase = await upsertPurchase(
      payment,
      {
        purpose: PURPOSE.FUNDING_ACCESS,
        fundingAccessPlanKey: payment.referenceId,
        programAllowance: plan?.programAllowance ?? null,
      },
      session,
    );
    await User.updateOne(
      { _id: payment.userId },
      { $set: { planningAccessStatus: ENUMS.PLANNING_ACCESS_STATUS.ACTIVE } },
      { session },
    );
    return { purchaseId: purchase._id };
  }

  if (payment.purpose === PURPOSE.FOUNDER_TIER) {
    const plan = await FounderPlan.findById(payment.referenceId).session(session).lean();
    const purchase = await upsertPurchase(
      payment,
      { purpose: PURPOSE.FOUNDER_TIER, planId: payment.referenceId },
      session,
    );
    await User.updateOne(
      { _id: payment.userId },
      {
        $set: {
          founderTier: plan?.name,
          foundingParticipant: true,
          founderBenefitsVersion: plan?.founderBenefitsVersion,
        },
        $min: { founderActivationDate: new Date() },
      },
      { session },
    );
    // TODO(founder-qualification): run founder qualification + permanent
    // founder number assignment here once that service exists. For now the
    // purchase and tier are recorded only.
    return { purchaseId: purchase._id };
  }

  // PROGRAM_ACTIVATION — mark the selection paid and link the payment.
  const result = await SuccessCenterSelection.updateOne(
    {
      _id: payment.referenceId,
      userId: payment.userId,
      activationStatus: ENUMS.SELECTION_ACTIVATION_STATUS.UNPAID,
    },
    {
      $set: {
        activationStatus: ENUMS.SELECTION_ACTIVATION_STATUS.PAID,
        activationPaymentId: payment._id,
        activationPaidAt: new Date(),
      },
    },
    { session },
  );
  if (result.matchedCount === 0) {
    const selection = await SuccessCenterSelection.findById(payment.referenceId)
      .select("activationPaymentId")
      .session(session)
      .lean();
    const paidBy = selection?.activationPaymentId;
    if (paidBy && !paidBy.equals(payment._id)) return { duplicateOf: paidBy };
  }
  return {};
};

/** Records the checkout acknowledgment for this payment if checkout didn't. */
const ensureAcknowledgment = async (payment, session) => {
  if (payment.legalAcceptanceId) return payment.legalAcceptanceId;
  const document = await getPublishedLegalDocument(
    ENUMS.LEGAL_DOCUMENT_TYPE.CHECKOUT_ACKNOWLEDGMENT,
  );
  const [acceptance] = await LegalAcceptance.create(
    [
      {
        userId: payment.userId,
        legalDocumentId: document._id,
        documentType: document.documentType,
        documentVersion: document.version,
        context: ENUMS.LEGAL_ACCEPTANCE_CONTEXT.CHECKOUT,
      },
    ],
    { session },
  );
  return acceptance._id;
};

const findPaymentForSession = async (checkoutSession) => {
  const paymentId = checkoutSession.metadata?.paymentId;
  if (!mongoose.isValidObjectId(paymentId)) return null;
  const payment = await Payment.findById(paymentId);
  // The session must be the one we created for this payment.
  if (!payment || (payment.checkoutSessionId && payment.checkoutSessionId !== checkoutSession.id))
    return null;
  return payment;
};

export const failCheckoutSession = async (checkoutSession, reason) => {
  const payment = await findPaymentForSession(checkoutSession);
  if (!payment) return;
  const failed = await Payment.findOneAndUpdate(
    { _id: payment._id, status: STATUS.PENDING },
    { $set: { status: STATUS.FAILED, failureReason: reason } },
    { new: true },
  );
  if (failed)
    await writeAuditLog({
      actorId: failed.userId,
      action: ENUMS.AUDIT_LOG_ACTION.FAILED_PAYMENT,
      targetType: ENUMS.AUDIT_LOG_TARGET_TYPE.PAYMENT,
      targetId: failed._id,
      afterValue: { status: failed.status, failureReason: reason },
    });
};

/** checkout.session.completed / async_payment_succeeded with payment_status "paid". */
export const fulfillCheckoutSession = async (checkoutSession) => {
  const payment = await findPaymentForSession(checkoutSession);
  if (!payment) {
    console.warn(`Stripe session ${checkoutSession.id}: no matching payment`);
    return;
  }
  if (payment.status === STATUS.COMPLETED) return; // already processed

  // Stripe's charged amount must match our server-resolved amount exactly.
  const expectedMinor = toMinorUnits(payment.amount, payment.currency);
  if (
    checkoutSession.amount_total !== expectedMinor ||
    checkoutSession.currency?.toUpperCase() !== payment.currency
  ) {
    // TODO(refunds): flag for manual refund review.
    await failCheckoutSession(checkoutSession, "Charged amount did not match the server amount");
    return;
  }

  const transactionRef =
    typeof checkoutSession.payment_intent === "string"
      ? checkoutSession.payment_intent
      : (checkoutSession.payment_intent?.id ?? checkoutSession.id);

  const outcome = await withOptionalTransaction(async (session) => {
    const { purchaseId, duplicateOf } = await activate(payment, session);
    const legalAcceptanceId = await ensureAcknowledgment(payment, session);

    // Flip to completed LAST — exactly one delivery wins this update.
    const completed = await Payment.findOneAndUpdate(
      { _id: payment._id, status: { $ne: STATUS.COMPLETED } },
      {
        $set: {
          status: STATUS.COMPLETED,
          providerTransactionRef: transactionRef,
          paymentDate: new Date(),
          checkoutSessionId: checkoutSession.id,
          legalAcceptanceId,
          ...(purchaseId && { purchaseId }),
        },
        $unset: { failureReason: 1 },
      },
      { new: true, session },
    );
    return { completed, duplicateOf };
  });

  if (!outcome.completed) return; // a concurrent delivery already finished it

  await writeAuditLog({
    actorId: outcome.completed.userId,
    action: ENUMS.AUDIT_LOG_ACTION.COMPLETED_PAYMENT,
    targetType: ENUMS.AUDIT_LOG_TARGET_TYPE.PAYMENT,
    targetId: outcome.completed._id,
    afterValue: {
      purpose: outcome.completed.purpose,
      referenceId: outcome.completed.referenceId,
      amount: outcome.completed.amount,
      currency: outcome.completed.currency,
      providerTransactionRef: outcome.completed.providerTransactionRef,
      // Paid for something another payment already activated.
      // TODO(refunds): surface these for refund review.
      ...(outcome.duplicateOf && { duplicateOfPayment: outcome.duplicateOf }),
    },
  });

  await sendPaymentReceipt(outcome.completed);
};
