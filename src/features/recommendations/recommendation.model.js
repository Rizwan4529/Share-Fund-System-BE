import { ENUMS } from "#/utils/constants";
import mongoose from "mongoose";

const { Schema, model } = mongoose;

// Where a resolved rule value came from — the program's own activationRules
// or the global settings fallback.
const ruleValueSchema = new Schema(
  {
    value: { type: Schema.Types.Mixed },
    source: { type: String, enum: ["program", "setting"] },
  },
  { _id: false },
);

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
      // One snapshot per selection; recalculating replaces it.
      unique: true,
    },
    inputSnapshot: {
      netMonthlyIncome: { type: Number },
      essentialExpenses: { type: Number },
      monthlyDebt: { type: Number },
      existingCommitments: { type: Number },
      comfortableMonthlyAmount: { type: Number },
      currentSavings: { type: Number },
      emergencySavings: { type: Number },
      availableCashFlow: { type: Number },
      safeCapacity: { type: Number },
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
          affordable: { type: Boolean },
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
    suggestedAlternatives: {
      type: [String],
      default: [],
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
      // Everything needed to reproduce this snapshot: each resolved rule with
      // its source, plus the exact version of every setting that was read.
      resolvedRules: {
        activationPercentage: ruleValueSchema,
        roundingIncrement: ruleValueSchema,
        planMonthOptions: ruleValueSchema,
        growthPeriodDays: ruleValueSchema,
        percentageMin: ruleValueSchema,
        percentageMax: ruleValueSchema,
        minGoalAmount: ruleValueSchema,
        maxGoalAmount: ruleValueSchema,
      },
      settings: [
        {
          _id: false,
          key: { type: String },
          settingId: { type: Schema.Types.ObjectId, ref: "Setting" },
          value: { type: Schema.Types.Mixed },
          // versionHistory holds prior values, so current = length + 1.
          version: { type: Number },
          updatedAt: { type: Date },
        },
      ],
      programUpdatedAt: { type: Date },
    },
  },
  { timestamps: true },
);

const Recommendation = model("Recommendation", recommendationSchema);
export default Recommendation;
