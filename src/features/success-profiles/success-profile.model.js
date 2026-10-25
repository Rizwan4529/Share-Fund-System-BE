import { ENUMS } from "#/utils/constants.js";
import mongoose from "mongoose";
import { calculateCompletionPercentage } from "./success-profile.completion.js";

const { Schema, model } = mongoose;

const optionalAmount = { type: Number, min: 0, default: 0 };
const optionalText = { type: String, trim: true };

const successProfileSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      unique: true, // also creates the index
    },
    profileType: {
      type: String,
      enum: Object.values(ENUMS.SUCCESS_PROFILE_TYPE),
      required: [true, "Profile type is required"],
    },
    completionPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    status: {
      type: String,
      enum: Object.values(ENUMS.SUCCESS_PROFILE_STATUS),
      default: ENUMS.SUCCESS_PROFILE_STATUS.INCOMPLETE,
    },
    // Nested paths (not `type: Object`) so Mongoose enforces each field.
    // All optional so the participant can save a partial profile.
    financials: {
      netMonthlyIncome: optionalAmount,
      essentialExpenses: optionalAmount,
      monthlyDebt: optionalAmount,
      currentSavings: optionalAmount,
      emergencySavings: optionalAmount,
      existingCommitments: optionalAmount,
      comfortableMonthlyAmount: optionalAmount,
    },
    employmentSource: optionalText,
    discretionaryRule: {
      selectedPercentage: { type: Number, min: 0, max: 100 },
      label: {
        type: String,
        enum: Object.values(ENUMS.DISCRETIONARY_RULE_LABEL),
      },
      customPercentage: { type: Number, min: 0, max: 100 },
    },
    planningAnswers: {
      desiredResult: optionalText,
      whatIsBlocking: optionalText,
      wouldReducingExpenseHelp: optionalText,
      wouldIncreasingIncomeHelp: optionalText,
      willingToConsiderLongerTimeline: optionalText,
      goalPriorities: optionalText,
    },
    accuracyConfirmed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// Keep completionPercentage in sync on every save.
successProfileSchema.pre("validate", function () {
  this.completionPercentage = calculateCompletionPercentage(this);
});

const SuccessProfile = model("SuccessProfile", successProfileSchema);
export default SuccessProfile;
