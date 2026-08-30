import AuditLog from "./audit-log.model.js";

const toSnapshot = (value) => {
  if (value == null) return value;
  if (typeof value.toObject === "function") return value.toObject();
  return value;
};

export const writeAuditLog = async ({
  actorId,
  action,
  targetType,
  targetId,
  beforeValue,
  afterValue,
}) => {
  return AuditLog.create({
    actorId: actorId || null,
    action,
    targetType,
    targetId,
    beforeValue: toSnapshot(beforeValue),
    afterValue: toSnapshot(afterValue),
  });
};

export const listAuditLogs = async (query = {}) => {
  const filter = {};

  if (query.actorId) filter.actorId = query.actorId;
  if (query.action) filter.action = query.action;
  if (query.targetType) filter.targetType = query.targetType;
  if (query.targetId) filter.targetId = query.targetId;
  if (query.from || query.to) {
    filter.createdAt = {};
    if (query.from) filter.createdAt.$gte = query.from;
    if (query.to) filter.createdAt.$lte = query.to;
  }

  const logs = await AuditLog.find(filter)
    .sort({ createdAt: -1 })
    .limit(query.limit || 100)
    .populate("actorId", "firstName lastName email role");

  return {
    success: true,
    message: "Audit logs retrieved successfully",
    data: logs,
  };
};
