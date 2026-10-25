import { ENUMS } from "#/utils/constants";
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const successCenterSelectionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
      index: true,
    },
    categoryId: {
      // Derived from the program at selection time (context only).
      type: Schema.Types.ObjectId,
      ref: "SuccessCenterCategory",
      required: [true, "Category is required"],
    },
    programId: {
      type: Schema.Types.ObjectId,
      ref: "SuccessCenterProgram",
      required: [true, "Program is required"],
    },
    purchaseId: {
      // Funding-access purchase that grants this selection — set by the
      // later payment task; null until then.
      type: Schema.Types.ObjectId,
      ref: "FounderPurchase",
      default: null,
    },
    obligationType: {
      type: String,
      enum: Object.values(ENUMS.SUCCESS_CENTER_OBLIGATION_TYPE),
      required: [true, "Obligation type is required"],
    },
    pricingSource: {
      type: String,
      enum: Object.values(ENUMS.SUCCESS_CENTER_PRICING_SOURCE),
      default: ENUMS.SUCCESS_CENTER_PRICING_SOURCE.ESTIMATED,
    },
    verifiedQuoteAmount: {
      // Only set when pricingSource is "verified".
      type: Number,
      min: 0,
    },
    goalAmount: {
      type: Number,
      min: 0,
    },
    payee: {
      name: { type: String, trim: true },
      payeeType: {
        type: String,
        enum: Object.values(ENUMS.SUCCESS_CENTER_PAYEE_TYPE),
      },
      verified: { type: Boolean },
    },
    selectedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: Object.values(ENUMS.SUCCESS_CENTER_SELECTION_STATUS),
      default: ENUMS.SUCCESS_CENTER_SELECTION_STATUS.ACTIVE,
    },
    activationStatus: {
      // Set to "paid" only by a webhook-confirmed program_activation payment.
      type: String,
      enum: Object.values(ENUMS.SELECTION_ACTIVATION_STATUS),
      default: ENUMS.SELECTION_ACTIVATION_STATUS.UNPAID,
    },
    activationPaymentId: {
      type: Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },
    activationPaidAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

// One ACTIVE selection per user per program; removed ones don't count, so a
// participant can re-select a program after removing it.
successCenterSelectionSchema.index(
  { userId: 1, programId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: ENUMS.SUCCESS_CENTER_SELECTION_STATUS.ACTIVE,
    },
  },
);

const SuccessCenterSelection = model(
  "SuccessCenterSelection",
  successCenterSelectionSchema,
);

export default SuccessCenterSelection;
