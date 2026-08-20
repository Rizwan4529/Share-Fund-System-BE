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
      type: Schema.Types.ObjectId,
      ref: "FounderPurchase",
      required: [true, "Purchase is required"],
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
      type: String,
      trim: true,
      unique: true,
      required: [true, "Provider transaction reference is required"],
    },
    status: {
      type: String,
      enum: Object.values(ENUMS.PAYMENT_STATUS),
      default: ENUMS.PAYMENT_STATUS.PENDING,
      required: [true, "Status is required"],
    },
    paymentDate: {
      type: Date,
      required: [true, "Payment date is required"],
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
  },
  { timestamps: true },
);

const Payment = model("Payment", paymentSchema);

export default Payment;
