import { ENUMS } from "#/utils/constants";
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const bmisQueuesSchema = new Schema(
  {
    queueType: {
      type: String,
      enum: Object.values(ENUMS.BMIS_QUEUE_TYPE),
      required: [true, "Queue type is required"],
    },
    participantId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Participant is required"],
      index: true,
    },
    programId: {
      type: Schema.Types.ObjectId,
      ref: "SuccessCenterProgram",
      required: [true, "Program is required"],
    },
    goal: {
      type: Number,
    },
    approvedObligation: {
      type: Number,
    },
    growthPeriodStatus: {
      type: String,
      enum: Object.values(ENUMS.BMIS_QUEUE_GROWTH_PERIOD_STATUS),
    },
    eligibilityDate: {
      type: Date,
    },
    priorityScore: {
      type: Number,
      required: [true, "Priority score is required"],
    },
    fundingStatus: {
      type: String,
      enum: Object.values(ENUMS.BMIS_QUEUE_FUNDING_STATUS),
      default: ENUMS.BMIS_QUEUE_FUNDING_STATUS.PROJECTED,
      required: [true, "Funding status is required"],
    },
    reserveSupportStatus: {
      type: String,
      enum: Object.values(ENUMS.BMIS_QUEUE_RESERVE_SUPPORT_STATUS),
      default: ENUMS.BMIS_QUEUE_RESERVE_SUPPORT_STATUS.NONE,
    },
    capStatus: {
      type: String,
      enum: Object.values(ENUMS.BMIS_QUEUE_CAP_STATUS),
    },
    bmisDecision: {
      type: String,
      enum: Object.values(ENUMS.BMIS_QUEUE_DECISION),
      default: ENUMS.BMIS_QUEUE_DECISION.PENDING,
      required: [true, "BMIS decision is required"],
    },
    settingsVersionUsed: {
      type: Schema.Types.ObjectId,
      ref: "Setting",
    },
    auditHistory: {
      type: [{ status: String, at: Date, reason: String }],
    },
  },
  { timestamps: true },
);

const BmisQueue = model("BmisQueue", bmisQueuesSchema);

export default BmisQueue;
