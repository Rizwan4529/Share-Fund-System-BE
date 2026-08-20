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
    planId: {
      type: Schema.Types.ObjectId,
      ref: "FounderPlan",
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

const FounderPurchase = model("FounderPurchase", founderPurchaseSchema);

export default FounderPurchase;
