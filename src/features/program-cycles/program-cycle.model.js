import { ENUMS } from "#/utils/constants";
import mongoose from "mongoose";

const { Scheme, model } = mongoose;

const programCycleSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
    programId: {
      type: Schema.Types.ObjectId,
      ref: "SuccessCenterProgram",
      required: [true, "Program is required"],
    },
    growthPeriodStartDate: {
      type: Date,
      required: [true, "Growth period start date is required"],
    },
    growthPeriodEndDate: {
      type: Date,
      required: false,
    },
    eligibilityDate: {
      type: Date,
    },
    estimatedFundingWindow: {
      type: Date,
    },
    nextFundingCycleWindow: {
      type: Date,
    },
    reactivationDeadline: {
      type: Date,
    },
    reactivationStatus: {
      type: String,
      enum: Object.values(ENUMS.PROGRAM_CYCLE_REACTIVATION_STATUS),
      default: ENUMS.PROGRAM_CYCLE_REACTIVATION_STATUS.NOT_DUE,
    },
    automaticRenewalResult: {
      type: String,
      enum: Object.values(ENUMS.PROGRAM_CYCLE_AUTOMATIC_RENEWAL_RESULT),
      default: ENUMS.PROGRAM_CYCLE_AUTOMATIC_RENEWAL_RESULT.NOT_DUE,
    },
    missedReactivation: {
      type: Boolean,
      default: false,
    },
    growthPeriodRestart: {
      type: Boolean,
      default: false,
    },
    availableEligibleCash: {
      type: Number,
    },
    availableSuccessCredits: {
      type: Number,
    },
    authorizedAccountFundUsage: {
      type: Number,
    },
    currentBmisStatus: {
      type: String,
      enum: Object.values(ENUMS.PROGRAM_CYCLE_CURRENT_BMIS_STATUS),
      default: ENUMS.PROGRAM_CYCLE_CURRENT_BMIS_STATUS.PROJECTED,
    },
    statusChangeHistory: {
      type: [{ status: String, at: Date, reason: String }],
    },
  },
  { timestamps: true },
);

const ProgramCycle = model("ProgramCycle", programCycleSchema);
export default ProgramCycle;
