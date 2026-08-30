import { ENUMS } from "#/utils/constants";
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const auditLogSchema = new Schema(
  {
    actorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    action: {
      type: String,
      enum: Object.values(ENUMS.AUDIT_LOG_ACTION),
      required: [true, "Action type is required"],
    },
    targetType: {
      type: String,
      enum: Object.values(ENUMS.AUDIT_LOG_TARGET_TYPE),
      required: [true, "Target type is required"],
    },
    targetId: {
      type: Schema.Types.ObjectId,
      refPath: "targetType",
    },
    beforeValue: {
      type: Schema.Types.Mixed,
      default: null,
    },
    afterValue: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true },
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });

const AuditLog = model("AuditLog", auditLogSchema);
export default AuditLog;
