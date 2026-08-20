import { ENUMS } from "#/utils/constants";
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const recommendationSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
    selectionId: {
      type: Schema.Types.ObjectId,
      ref: "SuccessCenterSelection",
      required: [true, "Selection is required"],
    },
    inputSnapshot: {
      netMonthlyIncome: { type: Number },
      essentialExpenses: { type: Number },
      monthlyDebt: { type: Number },
      availableCashFlow: { type: Number },
    },
    options: {
      type: [
        {
          label: {
            type: String,
            enum: Object.values(ENUMS.RECOMMENDATION_LABEL),
          },
          totalGoal: { type: Number },
          activationPercentage: { type: Number },
          totalActivationRequirement: { type: Number },
          scheduledPayment: { type: Number },
          months: { type: Number },
          growthPeriodDays: { type: Number },
          estimatedFundingRange: { type: String },
        },
      ],
    },
    oneTimeOption: {
      totalActivationRequirement: { type: Number },
      payFullNow: { type: Boolean },
    },
    affordabilityStatus: {
      type: String,
      enum: Object.values(ENUMS.RECOMMENDATION_AFFORDABILITY_STATUS),
      required: [true, "Affordability status is required"],
    },
    selectedOption: {
      type: String,
      enum: Object.values(ENUMS.RECOMMENDATION_LABEL),
    },
    adminAdjusted: {
      type: Boolean,
      default: false,
    },
    rulesVersionUsed: {
      type: Schema.Types.ObjectId,
      ref: "Setting",
    },
  },
  { timestamps: true },
);

const Recommendation = model("Recommendation", recommendationSchema);
export default Recommendation;
