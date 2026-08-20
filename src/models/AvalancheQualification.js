import { ENUMS } from "#/utils/constants";
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const avalancheQualificationSchema = new Schema(
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
    approvedGoalAmount: {
      type: Number,
      required: [true, "Approved goal amount is required"],
    },
    applicableFundingTier: {
      type: String,
      trim: true,
    },
    requiredActivationPercentage: {
      type: Number,
      required: false,
      validate: {
        validator: (value) => {
          if (value == null) {
            return true;
          }
          if (value < 0 || value > 100) {
            return false;
          }
          return true;
        },
        message: "Required activation percentage must be between 0 and 100",
      },
    },
    fullUpfrontPaymentConfirmed: {
      type: Boolean,
      required: [true, "Full upfront payment confirmation is required"],
      default: false,
    },
    avalancheEligibility: {
      type: String,
      enum: Object.values(ENUMS.AVALANCHE_ELIGIBILITY),
      required: [true, "Avalanche eligibility is required"],
      default: ENUMS.AVALANCHE_ELIGIBILITY.INELIGIBLE,
    },
    avalancheQueueStatus: {
      type: String,
      enum: Object.values(ENUMS.AVALANCHE_QUEUE_STATUS),
      default: ENUMS.AVALANCHE_QUEUE_STATUS.NOT_QUEUED,
    },
    fundingCapLevel: {
      type: Number,
    },
    growthPeriod: {
      type: String,
      trim: true,
    },
    bmisApprovalStatus: {
      type: String,
      enum: Object.values(ENUMS.AVALANCHE_BMIS_APPROVAL_STATUS),
      default: ENUMS.AVALANCHE_BMIS_APPROVAL_STATUS.PENDING,
    },
    systemCapacityStatus: {
      type: String,
      enum: Object.values(ENUMS.AVALANCHE_SYSTEM_CAPACITY_STATUS),
      default: ENUMS.AVALANCHE_SYSTEM_CAPACITY_STATUS.AVAILABLE,
    },
    adminReviewRequired: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

const AvalancheQualification = model(
  "AvalancheQualification",
  avalancheQualificationSchema,
);

export default AvalancheQualification;
