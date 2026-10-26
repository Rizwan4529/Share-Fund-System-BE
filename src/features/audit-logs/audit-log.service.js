import mongoose from "mongoose";
import { ENUMS } from "#/utils/constants.js";
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
    .populate("actorId", "firstName lastName email role")
    .lean();

  return {
    success: true,
    message: "Audit logs retrieved successfully",
    data: await withTargetLabels(logs),
  };
};

/*
 * A readable name for each target (a setting's key, a document's title and
 * version...) so the audit log doesn't show bare ids. targetType is the model
 * name (it is also the refPath), so labels are looked up per type in one query.
 */
const TARGET_LABELS = {
  [ENUMS.AUDIT_LOG_TARGET_TYPE.SETTING]: ["key", (doc) => doc.key],
  [ENUMS.AUDIT_LOG_TARGET_TYPE.SETTING_CATEGORY]: ["label", (doc) => doc.label],
  [ENUMS.AUDIT_LOG_TARGET_TYPE.FOUNDER_PLAN]: ["name", (doc) => doc.name],
  [ENUMS.AUDIT_LOG_TARGET_TYPE.LEGAL_DOCUMENT]: [
    "title version",
    (doc) => `${doc.title} v${doc.version}`,
  ],
  [ENUMS.AUDIT_LOG_TARGET_TYPE.USER]: [
    "firstName lastName email",
    (doc) => `${doc.firstName ?? ""} ${doc.lastName ?? ""}`.trim() || doc.email,
  ],
  [ENUMS.AUDIT_LOG_TARGET_TYPE.SUCCESS_CENTER_CATEGORY]: ["name", (doc) => doc.name],
  [ENUMS.AUDIT_LOG_TARGET_TYPE.SUCCESS_CENTER_PROGRAM]: ["name", (doc) => doc.name],
  // "Alice Anders · Deposit Program"
  [ENUMS.AUDIT_LOG_TARGET_TYPE.RECOMMENDATION]: [
    "userId selectionId",
    (doc) =>
      [
        `${doc.userId?.firstName ?? ""} ${doc.userId?.lastName ?? ""}`.trim(),
        doc.selectionId?.programId?.name,
      ]
        .filter(Boolean)
        .join(" · ") || null,
    [
      { path: "userId", select: "firstName lastName" },
      { path: "selectionId", select: "programId", populate: { path: "programId", select: "name" } },
    ],
  ],
  // "Funding Access: Program bundle · Alice Anders"
  [ENUMS.AUDIT_LOG_TARGET_TYPE.PAYMENT]: [
    "description userId",
    (doc) =>
      [doc.description, `${doc.userId?.firstName ?? ""} ${doc.userId?.lastName ?? ""}`.trim()]
        .filter(Boolean)
        .join(" · ") || null,
    [{ path: "userId", select: "firstName lastName" }],
  ],
};

const withTargetLabels = async (logs) => {
  const idsByType = new Map();
  for (const log of logs) {
    if (!log.targetId || !TARGET_LABELS[log.targetType]) continue;
    if (!idsByType.has(log.targetType)) idsByType.set(log.targetType, new Set());
    idsByType.get(log.targetType).add(String(log.targetId));
  }

  const labels = new Map();
  for (const [type, ids] of idsByType) {
    const Model = mongoose.models[type];
    if (!Model) continue;
    const [fields, format, populate = []] = TARGET_LABELS[type];
    const docs = await Model.find({ _id: { $in: [...ids] } })
      .select(fields)
      .populate(populate)
      .lean();
    for (const doc of docs) labels.set(`${type}:${doc._id}`, format(doc));
  }

  return logs.map((log) => ({
    ...log,
    targetLabel: labels.get(`${log.targetType}:${log.targetId}`) ?? null,
  }));
};
