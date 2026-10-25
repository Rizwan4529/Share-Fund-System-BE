import mongoose from "mongoose";
import { ENUMS } from "#/utils/constants";

const { Schema, model } = mongoose;

const founderPurchaseSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
    purpose: {
      // funding_access or founder_tier (program activations have no purchase).
      type: String,
      enum: [
        ENUMS.PAYMENT_PURPOSE.FUNDING_ACCESS,
        ENUMS.PAYMENT_PURPOSE.FOUNDER_TIER,
      ],
    },
    planId: {
      // Founder tier purchases: the FounderPlan bought.
      type: Schema.Types.ObjectId,
      ref: "FounderPlan",
    },
    fundingAccessPlanKey: {
      // Funding Access purchases: the plan key from the pricing settings.
      type: String,
      trim: true,
    },
    programAllowance: {
      // Funding Access purchases: programs this purchase allows (frozen).
      type: Number,
      min: 0,
    },
    activationStatus: {
      type: String,
      enum: Object.values(ENUMS.FOUNDER_PURCHASE_ACTIVATION_STATUS),
      default: ENUMS.FOUNDER_PURCHASE_ACTIVATION_STATUS.PENDING,
    },
    purchasedAt: {
      type: Date,
    },
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: "Payment",
    },
  },
  { timestamps: true },
);

// One purchase per payment — a re-delivered webhook can't create a second.
founderPurchaseSchema.index(
  { paymentId: 1 },
  { unique: true, partialFilterExpression: { paymentId: { $type: "objectId" } } },
);

const FounderPurchase = model("FounderPurchase", founderPurchaseSchema);

export default FounderPurchase;
