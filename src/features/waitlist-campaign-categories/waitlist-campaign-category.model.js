import mongoose from "mongoose";

const { Schema, model } = mongoose;

const waitlistCampaignCategorySchema = new Schema(
  {
    slug: {
      type: String,
      required: [true, "Slug is required"],
      unique: true,
      trim: true,
      lowercase: true,
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
      default: "",
    },
    order: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true },
);

const WaitlistCampaignCategory = model(
  "WaitlistCampaignCategory",
  waitlistCampaignCategorySchema,
);

export default WaitlistCampaignCategory;
