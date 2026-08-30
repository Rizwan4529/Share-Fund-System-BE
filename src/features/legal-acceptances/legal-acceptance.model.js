import { ENUMS } from "#/utils/constants";
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const legalAcceptanceSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: [true, "User ID is required"],
    index: true,
  },
  legalDocumentId: {
    type: Schema.Types.ObjectId,
    ref: "LegalDocument",
    required: [true, "Legal Document ID is required"],
  },
  documentType: {
    type: String,
    enum: Object.values(ENUMS.LEGAL_DOCUMENT_TYPE),
    required: [true, "Document type is required"],
  },
  documentVersion: {
    type: Number,
    required: [true, "Document version is required"],
  },
  acceptedAt: {
    type: Date,
    required: [true, "Accepted AT is required"],
    default: Date.now,
  },
  context: {
    type: String,
    enum: Object.values(ENUMS.LEGAL_ACCEPTANCE_CONTEXT),
    required: [true, "Context is required"],
  },
});

legalAcceptanceSchema.index({ userId: 1, acceptedAt: -1 });
legalAcceptanceSchema.index({ userId: 1, legalDocumentId: 1 });

const LegalAcceptance = model("LegalAcceptance", legalAcceptanceSchema);
export default LegalAcceptance;
