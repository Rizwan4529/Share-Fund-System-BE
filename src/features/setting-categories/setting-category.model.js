import mongoose from "mongoose";

const { Schema, model } = mongoose;

const settingCategorySchema = new Schema(
  {
    slug: {
      type: String,
      required: [true, "Slug is required"],
      unique: true,
      trim: true,
      index: true,
    },
    label: {
      type: String,
      required: [true, "Label is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

const SettingCategory = model("SettingCategory", settingCategorySchema);

export default SettingCategory;
