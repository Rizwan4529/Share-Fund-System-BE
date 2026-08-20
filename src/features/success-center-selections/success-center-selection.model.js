import { ENUMS } from "#/utils/constants";
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const successCenterSelectionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "SuccessCenterCategory",
      required: [true, "Category is required"],
    },
    programId: {
      type: Schema.Types.ObjectId,
      ref: "SuccessCenterProgram",
      required: [true, "Program is required"],
    },
    obligationType: {
      type: String,
      enum: Object.values(ENUMS.SUCCESS_CENTER_OBLIGATION_TYPE),
      required: [true, "Obligation type is required"],
    },
    pricingSource: {
      type: String,
      enum: Object.values(ENUMS.SUCCESS_CENTER_PRICING_SOURCE),
    },
    verifiedQuoteAmount: {
      type: Number,
    },
    payee: {
      name: { type: String },
      payeeType: {
        type: String,
        enum: Object.values(ENUMS.SUCCESS_CENTER_PAYEE_TYPE),
      },
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
  },
  { timestamps: true },
);

const SuccessCenterSelection = model(
  "SuccessCenterSelection",
  successCenterSelectionSchema,
);

export default SuccessCenterSelection;
