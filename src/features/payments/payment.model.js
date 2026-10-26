import { ENUMS } from "#/utils/constants";
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const paymentSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
      index: true,
    },
    purchaseId: {
      // Set when a funding_access / founder_tier payment is fulfilled; a
      // program_activation payment has no purchase.
      type: Schema.Types.ObjectId,
      ref: "FounderPurchase",
    },
    purpose: {
      type: String,
      enum: Object.values(ENUMS.PAYMENT_PURPOSE),
      required: [true, "Payment purpose is required"],
    },
    referenceId: {
      // What is being paid for: a Funding Access plan key, a FounderPlan id,
      // or a SuccessCenterSelection id (depends on purpose).
      type: String,
      trim: true,
      required: [true, "Payment reference is required"],
    },
    description: {
      // Human-readable purchase name, frozen at checkout for receipts/history.
      type: String,
      trim: true,
    },
    checkoutSessionId: {
      type: String,
      trim: true,
    },
    legalAcceptanceId: {
      // The checkout acknowledgment version accepted for this payment.
      type: Schema.Types.ObjectId,
      ref: "LegalAcceptance",
    },
    failureReason: {
      type: String,
      trim: true,
    },
    // Latest declined card attempt while the checkout is still open (the
    // payment stays pending — the participant can try another card).
    lastAttemptFailureReason: {
      type: String,
      trim: true,
    },
    lastAttemptFailedAt: {
      type: Date,
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
    },
    currency: {
      type: String,
      trim: true,
      uppercase: true,
      required: [true, "Currency is required"],
    },
    provider: {
      type: String,
      enum: Object.values(ENUMS.PAYMENT_PROVIDER),
      default: ENUMS.PAYMENT_PROVIDER.STRIPE,
      required: [true, "Provider is required"],
    },
    providerTransactionRef: {
      // Stripe PaymentIntent id — only known once the payment succeeds.
      // Unique (see index below) so one charge can't be recorded twice.
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(ENUMS.PAYMENT_STATUS),
      default: ENUMS.PAYMENT_STATUS.PENDING,
      required: [true, "Status is required"],
    },
    paymentDate: {
      // Set when the webhook confirms the payment.
      type: Date,
    },
    refundDeadline: {
      type: Date,
    },
    refundStatus: {
      type: String,
      enum: Object.values(ENUMS.PAYMENT_REFUND_STATUS),
      default: ENUMS.PAYMENT_REFUND_STATUS.NONE,
    },
    refundAmount: {
      type: Number,
    },
    refundRequestDate: {
      type: Date,
    },
    refundProcessedDate: {
      type: Date,
    },
    accountStatusAfterRefund: {
      type: String,
      trim: true,
    },
    disputeStatus: {
      type: String,
      enum: Object.values(ENUMS.PAYMENT_DISPUTE_STATUS),
      default: ENUMS.PAYMENT_DISPUTE_STATUS.NONE,
    },
    receiptRef: {
      type: String,
      trim: true,
    },
    // Last time a receipt email was attempted (throttles automatic retries).
    receiptAttemptedAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

// Unique only once set — pending payments don't have a Stripe charge yet.
paymentSchema.index(
  { providerTransactionRef: 1 },
  { unique: true, partialFilterExpression: { providerTransactionRef: { $type: "string" } } },
);
paymentSchema.index(
  { checkoutSessionId: 1 },
  { unique: true, partialFilterExpression: { checkoutSessionId: { $type: "string" } } },
);
paymentSchema.index({ userId: 1, createdAt: -1 });

const Payment = model("Payment", paymentSchema);

export default Payment;
