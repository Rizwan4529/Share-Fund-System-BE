import { ENUMS } from "#/utils/constants";
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const legalAcceptanceSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: [true, "User ID is required"],
  },
  legalDocumentId: {
    type: Schema.Types.ObjectId,
    ref: "LegalDocument",
    required: [true, "Legal Document ID is required"],
  },
  acceptedAt: {
    type: Date,
    required: [true, "Accepted AT is required"],
    default: Date.now,
  },
  context: {
    type: String,
  },
});

const LegalAcceptance = model("LegalAcceptance", legalAcceptanceSchema);
export default LegalAcceptance;
