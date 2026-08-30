import { ENUMS } from "#/utils/constants";
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const sucessCenterCategorySchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
    },
    slug: {
      type: String,
      required: [true, "Slug is required"],
      unique: true,
    },
    description: {
      type: String,
      required: false,
      // required:[true,"Description is required"],
      // minLength:[10, "Description must be at least 10 characters long"],
      // maxLength:[500,"Description must be less than 500 characters long"]
    },
    programsIntroduction: {
      type: String,
      required: false,
    },
    order: {
      type: Number,
      required: [true, "Order is required"],
    },
    image: {
      type: String,
      required: false,
    },
    status: {
      type: String,
      enum: Object.values(ENUMS.SUCCESS_CENTER_CATEGORY_STATUS),
      default: ENUMS.SUCCESS_CENTER_CATEGORY_STATUS.ACTIVE,
    },
    icon: {
      type: String,
      required: false,
    },
  },
  { timestamps: true },
);

sucessCenterCategorySchema.pre("save", async function () {
  if (!this.isNew || this.order != null) return;

  const lastCategory = await this.constructor
    .findOne()
    .sort({ order: -1 })
    .select("order");

  this.order = lastCategory ? lastCategory.order + 1 : 1;
});

const SucessCenterCategory = model(
  "SuccessCenterCategory",
  sucessCenterCategorySchema,
);
export default SucessCenterCategory;
