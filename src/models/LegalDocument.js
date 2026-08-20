import { ENUMS } from "#/utils/constants";
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const legalDocumentsSchema = new Schema(
  {
    documentType: {
      type: String,
      enum: Object.values(ENUMS.LEGAL_DOCUMENT_TYPE),
      required: [true, "Document Type is required"],
    },
    title: {
      type: String,
      trim: true,
      required: [true, "Title is required"],
    },
    content: {
      type: String,
      trim: true,
      required: [true, "Content is required"],
    },
    version: {
      type: Number,
      required: [true, "Version is required"],
    },
    status: {
      type: String,
      enum: Object.values(ENUMS.LEGAL_DOCUMENT_STATUS),
    },
    effectiveDate: { type: Date },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

const LegalDocument = model("LegalDocument", legalDocumentsSchema);

export default LegalDocument;
