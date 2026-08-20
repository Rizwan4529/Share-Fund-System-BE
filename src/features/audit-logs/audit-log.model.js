import { ENUMS } from "#/utils/constants";
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const auditLogSchema = new Schema({
  actorId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: [true, "Actor ID is required"],
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
});

const AuditLog = model("AuditLog", auditLogSchema);
export default AuditLog;
