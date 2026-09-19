import { ENUMS } from "#/utils/constants.js";
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const waitlistEntrySchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [120, "Name must be 120 characters or fewer"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
      index: true,
    },
    campaignCategory: {
      type: String,
      required: [true, "Campaign category is required"],
      trim: true,
      lowercase: true,
      index: true,
    },
    message: {
      type: String,
      trim: true,
      maxlength: [500, "Message must be 500 characters or fewer"],
      default: "",
    },
    status: {
      type: String,
      enum: Object.values(ENUMS.WAITLIST_STATUS),
      default: ENUMS.WAITLIST_STATUS.PENDING,
      index: true,
    },
  },
  { timestamps: true },
);

waitlistEntrySchema.index({ email: 1, campaignCategory: 1 });

const WaitlistEntry = model("WaitlistEntry", waitlistEntrySchema);

export default WaitlistEntry;
