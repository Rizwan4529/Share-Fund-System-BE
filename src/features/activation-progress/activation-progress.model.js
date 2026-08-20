import mongoose from "mongoose";

const { Schema, model } = mongoose;

const activationProgressSchema = new Schema({
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
  totalApprovedGoal: {
    type: Number,
    required: [true, "Total approved goal is required"],
  },
  requiredActivationPercentage: {
    type: Number,
    required: false,
    validate: {
      validator: (value) => {
        if (value < 0 || value > 100) {
          return false;
        }
        return true;
      },
      message: "Required activation percentage must be between 0 and 100",
    },
  },
  totalActivationRequirement: {
    type: Number,
    required: [true, "Total activation requirement is required"],
  },
  amountCompleted: {
    type: Number,
    required: [true, "Amount completed is required"],
  },
  remainingActivationBalance: {
    type: Number,
    required: [true, "Remaining activation balance is required"],
  },
  contributionSchedule: {
    monthlyAmount: {
      type: Number,
      required: [true, "Monthly amount is required"],
    },
    months: {
      type: Number,
      required: [true, "Months is required"],
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
  },
  paymentHistory: {
    type: [
      {
        amount: {
          type: Number,
          required: [true, "Amount is required"],
        },
        date: {
          type: Date,
          required: [true, "Date is required"],
        },
        paymentId: {
          type: Schema.Types.ObjectId,
          ref: "Payment",
          required: [true, "Payment ID is required"],
        },
      },
    ],
  },
  nextPaymentDue: {
    type: Date,
  },
  fullUpfrontStatus: {
    type: String,
    enum: Object.values(ENUMS.ACTIVATION_PROGRESS_FULL_UPFRONT_STATUS),
    default: ENUMS.ACTIVATION_PROGRESS_FULL_UPFRONT_STATUS.NOT_FULL_UPFRONT,
  },
  avalancheQualification: {
    type: String,
    enum: Object.values(ENUMS.ACTIVATION_PROGRESS_AVALANCHE_QUALIFICATION),
    default: ENUMS.ACTIVATION_PROGRESS_AVALANCHE_QUALIFICATION.NOT_QUALIFIED,
  },
  growthPeriodStart: {
    type: Date,
  },
  growthPeriodCompletion: {
    type: Date,
  },
  eligibilityStatus:{
    type:String,
    enum:Object.values(ENUMS.ACTIVATION_PROGRESS_ELIGIBILITY_STATUS),
    default: ENUMS.ACTIVATION_PROGRESS_ELIGIBILITY_STATUS.NOT_ELIGIBLE,
  },
  fundingEstimateStatus:{
    type:String,
    enum:Object.values(ENUMS.ACTIVATION_PROGRESS_FUNDING_ESTIMATE_STATUS),
    default: ENUMS.ACTIVATION_PROGRESS_FUNDING_ESTIMATE_STATUS.PROJECTED,
  },
});

const ActivationProgress = model(
  "ActivationProgress",
  activationProgressSchema,
);

export default ActivationProgress;
