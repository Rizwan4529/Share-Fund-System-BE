import { ENUMS } from "#/utils/constants";
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const founderPlanSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      unique: true,
      enum: Object.values(ENUMS.FOUNDER_PLAN_NAME),
    },
    price: {
      // one time payment for the founder plan
      type: Number,
      required: [true, "Price is required"],
    },
    includedSuccessCenters: {
      type: [{ type: Schema.Types.ObjectId, ref: "SuccessCenterProgram" }],
      required: [true, "At least one success center is required"],
      minlength: [1, "At least one success center is required"],
    },
    fundingCap: {
      // restraint on how much funding can he get from the platform due to his founder plan
      standard: { type: Number, default: null },
      premium: { type: Number, default: null },
    },
    eligiblePrograms: {
      type: [{ type: Schema.Types.ObjectId, ref: "SuccessCenterProgram" }],
      default: [],
    },
    majorOneTimeProgramsEligible: {
      type: Boolean,
      default: false,
    },
    priorityLevel: {
      type: String,
      enum: Object.values(ENUMS.FOUNDER_PLAN_PRIORITY_LEVEL),
      default: ENUMS.FOUNDER_PLAN_PRIORITY_LEVEL.STANDARD,
    },
    bmisPlanningLevel: {
      // describing how deep and detailed the BMIS planning and recommendations are for this tier.
      type: String,
      enum: Object.values(ENUMS.FOUNDER_PLAN_BMIS_PLANNING_LEVEL),
      default: ENUMS.FOUNDER_PLAN_BMIS_PLANNING_LEVEL.STANDARD,
    },
    // futureProgramUnlocks: {
    //   // allowing the founder to unlock future programs that are not included in the plan
    //   type: Boolean,
    //   default: false,
    // },
    founderBenefitsVersion: {
      // a version tag (a label like "v1", "v2", or a date) recording which set of Founder benefits was in effect when this person became a Founder.
      type: String,
      default: "v1",
    },
    status: {
      type: String,
      enum: Object.values(ENUMS.FOUNDER_PLAN_STATUS),
      default: ENUMS.FOUNDER_PLAN_STATUS.ACTIVE,
    },
  },
  { timestamps: true },
);

const FounderPlan = model("FounderPlan", founderPlanSchema);

export default FounderPlan;

// founderBenefitsVersion

// What it is: a version tag (a label like "v1", "v2", or a date) recording which set of Founder benefits was in effect when this person became a Founder.

// Why it exists: Todd will change the Founder plans over time, prices, caps, included programs, perks. But people who already became Founders under the old terms should keep the benefits they originally signed up for. You can't let a plan edit silently downgrade existing Founders. This tag freezes their terms in place.
