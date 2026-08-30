import { ENUMS } from "#/utils/constants";
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const settingsSchema = new Schema(
  {
    key: {
      type: String,
      unique: true,
      trim: true,
      index: true,
      required: [true, "Key is required"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
      index: true,
    },
    value: {
      type: Schema.Types.Mixed,
      required: [true, "Value is required"],
      validate: {
        validator: (value) => {
          return (
            typeof value === "number" ||
            Array.isArray(value) ||
            (            typeof value === "object" &&
              value !== null &&
              !Array.isArray(value))
          );
        },
        message: "Value must be an array, number or an object",
      },
    },
    dataType: {
      type: String,
      required: [true, "Data Type is required"],
      enum: Object.values(ENUMS.SETTINGS_DATA_TYPE),
    },
    description: {
      type: String,
    },
    versionHistory: {
      type: [
        {
          value: {
            type: Schema.Types.Mixed,
            required: [true, "Value is required"],
          },
          updatedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Updated by is required"],
          },
          at: { type: Date, default: Date.now },
          reason: { type: String },
        },
      ],
    },
    effectiveDate: {
      type: Date,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

const Setting = model("Setting", settingsSchema);

export default Setting;
