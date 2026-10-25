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

// Timeline + funding range estimate for one option (projection-calculation.js).
// Dates are absent when status is "not_configured".
const optionProjectionSchema = new Schema(
  {
    // Always true: these are estimates, never guaranteed outcomes.
    isProjection: { type: Boolean, default: true },
    status: { type: String, enum: Object.values(ENUMS.PROJECTION_STATUS) },
    growthPeriodStartDate: { type: Date },
    growthPeriodCompletionDate: { type: Date },
    eligibilityDate: { type: Date },
    activationMonths: { type: Number },
    activationCompletionDate: { type: Date },
    estimatedFundingRange: {
      earliest: { type: Date },
      latest: { type: Date },
      basis: { type: String, enum: Object.values(ENUMS.PROJECTION_STATUS) },
      anchor: {
        type: String,
        enum: Object.values(ENUMS.PROJECTION_FUNDING_ANCHOR),
      },
    },
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
          affordable: { type: Boolean },
          projection: optionProjectionSchema,
        },
      ],
    },
    oneTimeOption: {
      totalActivationRequirement: { type: Number },
      payFullNow: { type: Boolean },
      projection: optionProjectionSchema,
    },
    // How the option projections were produced, for display and reproduction.
    projection: {
      isProjection: { type: Boolean, default: true },
      status: { type: String, enum: Object.values(ENUMS.PROJECTION_STATUS) },
      notice: { type: String },
      basis: { type: String, enum: Object.values(ENUMS.PROJECTION_BASIS) },
      basisDate: { type: Date },
      goalNature: {
        type: String,
        enum: Object.values(ENUMS.SUCCESS_CENTER_GOAL_NATURE),
      },
      // Projection rules missing from both the program and settings.
      missingRules: { type: [String], default: undefined },
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
        eligibilityOffsetDays: ruleValueSchema,
        fundingStartOffsetDays: ruleValueSchema,
        fundingRangeDays: ruleValueSchema,
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
