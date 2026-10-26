import { ENUMS, HTTP_STATUS } from "#/utils/constants.js";
import { AppError } from "#/utils/appError.js";
import LegalDocument from "./legal-document.model.js";
import { writeAuditLog } from "#/features/audit-logs/audit-log.service.js";
import { legalHtmlHasText, sanitizeLegalHtml } from "./sanitize-legal-html.js";

const auditLegalDocument = async (
  user,
  action,
  document,
  beforeValue,
  afterValue,
) => {
  await writeAuditLog({
    actorId: user._id,
    action,
    targetType: ENUMS.AUDIT_LOG_TARGET_TYPE.LEGAL_DOCUMENT,
    targetId: document._id,
    beforeValue,
    afterValue: afterValue ?? document,
  });
};

const findLatestByType = async (documentType) => {
  return LegalDocument.findOne({ documentType }).sort({ version: -1 });
};

/** Published versions whose effective date has arrived (or that have none). */
const inEffect = (now = new Date()) => ({
  status: ENUMS.LEGAL_DOCUMENT_STATUS.PUBLISHED,
  $or: [{ effectiveDate: { $lte: now } }, { effectiveDate: null }],
});

/** The version participants see: the newest published one already in effect. */
const findPublishedByType = async (documentType) => {
  return LegalDocument.findOne({ documentType, ...inEffect() }).sort({
    version: -1,
  });
};

/** Strips disallowed HTML; rejects content left with no visible text. */
const cleanContent = (content) => {
  if (content === undefined) return undefined;
  const clean = sanitizeLegalHtml(content);
  if (!legalHtmlHasText(clean))
    throw new AppError("Content is required", HTTP_STATUS.BAD_REQUEST, [
      { field: "content", message: "Content is required" },
    ]);
  return clean;
};

const findByTypeAndVersion = async (documentType, version) => {
  const document = await LegalDocument.findOne({ documentType, version });
  if (!document)
    throw new AppError(
      `Legal document '${documentType}' version ${version} not found`,
      HTTP_STATUS.NOT_FOUND,
    );
  return document;
};

const currentPublishedPerType = (documents) => {
  const current = [];
  const seen = new Set();
  for (const document of documents) {
    if (seen.has(document.documentType)) continue;
    seen.add(document.documentType);
    current.push(document);
  }
  return current;
};

export const getPublishedLegalDocument = async (documentType) => {
  const document = await findPublishedByType(documentType);
  if (!document)
    throw new AppError(
      `No published '${documentType}' document found`,
      HTTP_STATUS.NOT_FOUND,
    );
  return document;
};

export const requirePublishedDocuments = async (documentTypes) => {
  const documents = [];
  const missing = [];
  for (const documentType of documentTypes) {
    const document = await findPublishedByType(documentType);
    if (document) documents.push(document);
    else missing.push(documentType);
  }
  if (missing.length)
    throw new AppError(
      `Published legal documents required before signup: ${missing.join(", ")}`,
      HTTP_STATUS.BAD_REQUEST,
    );
  return documents;
};

export const listLegalDocuments = async (user) => {
  if (user.role === ENUMS.ROLES.ADMIN) {
    const documents = await LegalDocument.find()
      .sort({ documentType: 1, version: -1 })
      .populate("updatedBy", "firstName lastName email");
    return {
      success: true,
      message: "Legal documents retrieved successfully",
      data: documents,
    };
  }

  const documents = await LegalDocument.find(inEffect()).sort({
    documentType: 1,
    version: -1,
  });

  return {
    success: true,
    message: "Legal documents retrieved successfully",
    data: currentPublishedPerType(documents),
  };
};

export const getLegalDocumentByType = async (documentType) => {
  const document = await getPublishedLegalDocument(documentType);
  return {
    success: true,
    message: "Legal document retrieved successfully",
    data: document,
  };
};

export const getLegalDocumentVersion = async (documentType, version, user) => {
  const document = await findByTypeAndVersion(documentType, version);

  if (
    document.status !== ENUMS.LEGAL_DOCUMENT_STATUS.PUBLISHED &&
    user.role !== ENUMS.ROLES.ADMIN
  )
    throw new AppError(
      `Legal document '${documentType}' version ${version} not found`,
      HTTP_STATUS.NOT_FOUND,
    );

  return {
    success: true,
    message: "Legal document version retrieved successfully",
    data: document,
  };
};

export const listLegalDocumentVersions = async (documentType) => {
  const documents = await LegalDocument.find({ documentType })
    .sort({ version: -1 })
    .populate("updatedBy", "firstName lastName email");

  return {
    success: true,
    message: "Legal document versions retrieved successfully",
    data: documents,
  };
};

export const createLegalDocument = async (data, user) => {
  const existing = await findLatestByType(data.documentType);
  if (existing)
    throw new AppError(
      `A '${data.documentType}' document already exists. Update it to create a new version.`,
      HTTP_STATUS.CONFLICT,
    );

  const document = new LegalDocument({
    ...data,
    content: cleanContent(data.content),
    version: 1,
    status: ENUMS.LEGAL_DOCUMENT_STATUS.DRAFT,
    updatedBy: user._id,
  });
  await document.save();
  await auditLegalDocument(
    user,
    ENUMS.AUDIT_LOG_ACTION.CREATED_LEGAL_DOCUMENT,
    document,
    null,
    document,
  );

  return {
    success: true,
    message: "Legal document created successfully",
    data: document,
  };
};

export const updateLegalDocument = async (documentType, data, user) => {
  const latest = await findLatestByType(documentType);
  if (!latest)
    throw new AppError(
      `Legal document '${documentType}' not found`,
      HTTP_STATUS.NOT_FOUND,
    );
  const content = cleanContent(data.content);

  if (latest.status === ENUMS.LEGAL_DOCUMENT_STATUS.DRAFT) {
    const beforeValue = {
      title: latest.title,
      content: latest.content,
      version: latest.version,
      status: latest.status,
    };
    if (data.title !== undefined) latest.title = data.title;
    if (content !== undefined) latest.content = content;
    latest.updatedBy = user._id;
    await latest.save();
    await auditLegalDocument(
      user,
      ENUMS.AUDIT_LOG_ACTION.UPDATED_LEGAL_DOCUMENT,
      latest,
      beforeValue,
      latest,
    );

    return {
      success: true,
      message: "Legal document draft updated successfully",
      data: latest,
    };
  }

  const document = new LegalDocument({
    documentType,
    title: data.title ?? latest.title,
    content: content ?? latest.content,
    version: latest.version + 1,
    status: ENUMS.LEGAL_DOCUMENT_STATUS.DRAFT,
    updatedBy: user._id,
  });
  await document.save();
  await auditLegalDocument(
    user,
    ENUMS.AUDIT_LOG_ACTION.UPDATED_LEGAL_DOCUMENT,
    document,
    latest,
    document,
  );

  return {
    success: true,
    message: "Legal document version created successfully",
    data: document,
  };
};

export const publishLegalDocument = async (
  documentType,
  version,
  data,
  user,
) => {
  const document = await findByTypeAndVersion(documentType, version);

  if (document.status === ENUMS.LEGAL_DOCUMENT_STATUS.PUBLISHED)
    return {
      success: true,
      message: "Legal document is already published",
      data: document,
    };

  if (document.status !== ENUMS.LEGAL_DOCUMENT_STATUS.DRAFT)
    throw new AppError(
      "Only draft documents can be published",
      HTTP_STATUS.BAD_REQUEST,
    );

  const beforeValue = {
    status: document.status,
    effectiveDate: document.effectiveDate,
  };
  document.status = ENUMS.LEGAL_DOCUMENT_STATUS.PUBLISHED;
  document.effectiveDate = data.effectiveDate || new Date();
  document.updatedBy = user._id;
  await document.save();
  await auditLegalDocument(
    user,
    ENUMS.AUDIT_LOG_ACTION.PUBLISHED_LEGAL_DOCUMENT,
    document,
    beforeValue,
    {
      status: document.status,
      effectiveDate: document.effectiveDate,
    },
  );

  const scheduled = document.effectiveDate > new Date();
  return {
    success: true,
    message: scheduled
      ? `Legal document published. It becomes the current version on ${document.effectiveDate.toISOString().slice(0, 10)}; participants see the previous version until then.`
      : "Legal document published successfully",
    data: document,
  };
};
