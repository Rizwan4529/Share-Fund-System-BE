import { ENUMS } from "#/utils/constants";
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const successProfileSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      unique: true,
    },
    profileType: {
      type: String,
      enum: [
        ENUMS.SUCCESS_PROFILE_TYPE.INDIVIDUAL,
        ENUMS.SUCCESS_PROFILE_TYPE.HOUSEHOLD,
        ENUMS.SUCCESS_PROFILE_TYPE.GROUP,
        ENUMS.SUCCESS_PROFILE_TYPE.PROFESSIONAL,
        ENUMS.SUCCESS_PROFILE_TYPE.BUSINESS,
        ENUMS.SUCCESS_PROFILE_TYPE.ORGANIZATIONAL,
      ],
      required: [true, "Profile type is required"],
    },
    completionPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
      required: [true, "Completion percentage is required"],
    },
    status: {
      type: String,
      enum: [
        ENUMS.SUCCESS_PROFILE_STATUS.INCOMPLETE,
        ENUMS.SUCCESS_PROFILE_STATUS.COMPLETE,
      ],
      required: [true, "Status is required"],
      default: ENUMS.SUCCESS_PROFILE_STATUS.INCOMPLETE,
    },
    financials: {
      //Embedded Object
      // type: Object, commented this because it was causing the schema to be invalid, and the following fields were not being enforced by the database
      netMonthlyIncome: { type: Number, min: 0, default: 0 },
      essentialExpenses: { type: Number, min: 0, default: 0 },
      monthlyDebt: { type: Number, min: 0, default: 0 },
      currentSavings: { type: Number, min: 0, default: 0 },
      emergencySavings: { type: Number, min: 0, default: 0 },
      existingCommitments: { type: Number, min: 0, default: 0 },
      comfortableMonthlyAmount: { type: Number, min: 0, default: 0 },
    },
    discretionaryRule: {
      // type: Object,
      selectedPercentage: { type: Number, min: 0, max: 100, default: 0 },
      label: {
        type: String,
        enum: [
          ENUMS.DISCRETIONARY_RULE_LABEL.WEALTH_PRESERVATION_10,
          ENUMS.DISCRETIONARY_RULE_LABEL.CONSERVATIVE_20,
          ENUMS.DISCRETIONARY_RULE_LABEL.MODERATE_30,
          ENUMS.DISCRETIONARY_RULE_LABEL.FLEXIBLE_40,
          ENUMS.DISCRETIONARY_RULE_LABEL.CUSTOM,
        ],
        required: [true, "Label is required"],
      },
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

const SuccessProfile = model("SuccessProfile", successProfileSchema);
