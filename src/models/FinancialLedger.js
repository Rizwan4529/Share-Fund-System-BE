import { ENUMS } from "#/utils/constants";
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const financialLedgerSchema = new Schema(
  {
    transactionType: {
      type: String,
      enum: Object.values(ENUMS.FINANCIAL_LEDGER_TRANSACTION_TYPE),
      required: [true, "Transaction type is required"],
    },
    source: {
      type: String,
      trim: true,
    },
    destination: {
      type: String,
      trim: true,
    },
    participantId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Participant is required"],
    },
    programId: {
      type: Schema.Types.ObjectId,
      ref: "SuccessCenterProgram",
      required: [true, "Program is required"],
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
    },
    currency: {
      type: String,
      trim: true,
      uppercase: true,
      required: [true, "Currency is required"],
    },
    settingsVersion: {
      type: Schema.Types.ObjectId,
      ref: "Setting",
    },
    approvalStatus: {
      type: String,
      enum: Object.values(ENUMS.FINANCIAL_LEDGER_APPROVAL_STATUS),
      default: ENUMS.FINANCIAL_LEDGER_APPROVAL_STATUS.PENDING,
      required: [true, "Approval status is required"],
    },
    effectiveDate: {
      type: Date,
      required: [true, "Effective date is required"],
    },
    createdDate: {
      type: Date,
      required: [true, "Created date is required"],
    },
    relatedTransactionRef: {
      type: Schema.Types.ObjectId,
      ref: "FinancialLedger",
    },
    auditReference: {
      type: Schema.Types.ObjectId,
      ref: "AuditLog",
    },
    entryType: {
      type: String,
      enum: Object.values(ENUMS.FINANCIAL_LEDGER_ENTRY_TYPE),
      default: ENUMS.FINANCIAL_LEDGER_ENTRY_TYPE.SIMULATION,
      required: [true, "Entry type is required"],
    },
    supportingDetails: {
      type: Schema.Types.Mixed,
    },
  },
  { timestamps: true },
);

const FinancialLedger = model("FinancialLedger", financialLedgerSchema);

export default FinancialLedger;
