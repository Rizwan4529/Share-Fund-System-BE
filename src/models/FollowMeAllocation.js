import { ENUMS } from "#/utils/constants";
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const followMeAllocationSchema = new Schema(
  {
    followerParticipantId: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      required: [true, "Follower Participant ID is required"],
      index: true,
    },
    followedParticipantId: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      required: [true, "Followed Participant ID is required"],
    },
    qualifyingActivationTxnId: {
      type: Schema.Types.ObjectId,
      ref: "FinancialLedger",
    },
    eligibleFollowedProgramId: {
      type: Schema.Types.ObjectId,
      ref: "SuccessCenterProgram",
    },
    directedAllocationPercent: {
      type: Number,
      default: 12.5,
      required: [true, "Directed Allocation Percent is required"],
    },
    widerBmisAllocationPercent: {
      type: Number,
      default: 12.5,
      required: [true, "Wider BMIS Allocation Percent is required"],
    },
    overfundingPrevented: {
      type: Boolean,
    },
    remainingEligibleObligation: {
      type: Number,
    },
    excessRollover: {
      type: Number,
    },
    monthlyLimit: {
      type: Number,
    },
    relationshipStatus: {
      type: String,
      enum: Object.values(ENUMS.FOLLOW_ME_ALLOCATIONS_RELATIONSHIP_STATUS),
      default: ENUMS.FOLLOW_ME_ALLOCATIONS_RELATIONSHIP_STATUS.ACTIVE,
      required: [true, "Relationship Status is required"],
    },
    allocationHistory: {
      type: Array,
    },
    auditTrail: {
      type: Schema.Types.ObjectId,
      ref: "AuditLog",
    },
    entryType: {
      type: String,
      enum: Object.values(ENUMS.FOLLOW_ME_ALLOCATIONS_ENTRY_TYPE),
      default: ENUMS.FOLLOW_ME_ALLOCATIONS_ENTRY_TYPE.SIMULATION,
      required: [true, "Entry Type is required"],
    },
  },
  { timestamps: true },
);

const FollowMeAllocation = model(
  "FollowMeAllocation",
  followMeAllocationSchema,
);
export default FollowMeAllocation;
