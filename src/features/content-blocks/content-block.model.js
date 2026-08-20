import { ENUMS } from "#/utils/constants";
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const contentBlocksSchema = new Schema(
  {
    key: {
      type: String,
      unique: true,
    },
    type: {
      type: String,
      enum: Object.values(ENUMS.CONTENT_BLOCK_TYPE),
      required: [true, "Content Type is required"],
    },
    title: {
      type: String,
      trim: true,
      required: [true, "Title is required"],
    },
    body: {
      type: Schema.Types.Mixed,
      trim: true,
      required: [true, "Body is required"],
    },
    attachmentUrl: {
      type: String,
    },
    displayOrder: {
      type: Number,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

const ContentBlock = model("ContentBlock", contentBlocksSchema);
export default ContentBlock;
