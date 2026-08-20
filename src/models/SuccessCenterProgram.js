import { ENUMS } from "#/utils/constants";
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const sucessCenterProgramsSchema = new Schema(
  {
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "SuccessCenterCategory",
      required: [true, "Category is required"],
      index: true,
    },
    name: {
      type: String,
      required: [true, "Name is required"],
    },
    description: {
      type: String,
    },
    educationalContent: {
      type: String,
    },
    status: {
      type: String,
      enum: Object.values(ENUMS.SUCCESS_CENTER_PROGRAM_STATUS),
      default: ENUMS.SUCCESS_CENTER_PROGRAM_STATUS.DRAFT,
    },
    programType: {
      type: String,
      enum: Object.values(ENUMS.SUCCESS_CENTER_PROGRAM_TYPE),
      default: ENUMS.SUCCESS_CENTER_PROGRAM_TYPE.PLANNING,
    },
    goalNature: {
      type: String,
      enum: Object.values(ENUMS.SUCCESS_CENTER_GOAL_NATURE),
      default: ENUMS.SUCCESS_CENTER_GOAL_NATURE.ONE_TIME,
    },
    programQuestions: {
      type: Array,
    },
    activationRules: {
      // type: Object, commented this because it was causing the schema to be invalid, and the following fields were not being enforced by the database
      activationPercentageMin: { type: Number, default: null },
      activationPercentageMax: { type: Number, default: null },
      defaultActivationPercentage: { type: Number, default: null },
      growthPeriodDays: { type: Number, default: null },
      roundingIncrement: { type: Number, default: null },
      minGoalAmount: { type: Number, default: null },
      maxGoalAmount: { type: Number, default: null },
    },
    order: {
      type: Number,
    },
  },
  { timestamps: true },
);

sucessCenterProgramsSchema.pre("save", async function (next) {
  if (!this.isNew) return next();

  const lastProgram = await this.constructor
    .findOne()
    .sort({ order: -1 })
    .select("order");

  this.order = lastProgram ? lastProgram.order + 1 : 1;
  next();
});

const SuccessCenterProgram = model(
  "SuccessCenterProgram",
  sucessCenterProgramsSchema,
);
export default SuccessCenterProgram;
