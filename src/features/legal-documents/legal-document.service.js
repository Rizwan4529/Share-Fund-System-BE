import { ENUMS, HTTP_STATUS } from "#/utils/constants.js";
import { AppError } from "#/utils/appError.js";
import LegalDocument from "./legal-document.model.js";
import AuditLog from "#/features/audit-logs/audit-log.model.js";

const writeAuditLog = async (user, action, document) => {
  await AuditLog.create({
    actorId: user._id,
    action,
    targetType: ENUMS.AUDIT_LOG_TARGET_TYPE.LEGAL_DOCUMENT,
    targetId: document._id,
  });
};

const findLatestByType = async (documentType) => {
  return LegalDocument.findOne({ documentType }).sort({ version: -1 });
};

const findPublishedByType = async (documentType) => {
  return LegalDocument.findOne({
    documentType,
    status: ENUMS.LEGAL_DOCUMENT_STATUS.PUBLISHED,
  }).sort({ version: -1 });
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

  const documents = await LegalDocument.find({
    status: ENUMS.LEGAL_DOCUMENT_STATUS.PUBLISHED,
  }).sort({ documentType: 1, version: -1 });

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
    version: 1,
    status: ENUMS.LEGAL_DOCUMENT_STATUS.DRAFT,
    updatedBy: user._id,
  });
  await document.save();
  await writeAuditLog(
    user,
    ENUMS.AUDIT_LOG_ACTION.CREATED_LEGAL_DOCUMENT,
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

  if (latest.status === ENUMS.LEGAL_DOCUMENT_STATUS.DRAFT) {
    if (data.title !== undefined) latest.title = data.title;
    if (data.content !== undefined) latest.content = data.content;
    latest.updatedBy = user._id;
    await latest.save();
    await writeAuditLog(
      user,
      ENUMS.AUDIT_LOG_ACTION.UPDATED_LEGAL_DOCUMENT,
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
    content: data.content ?? latest.content,
    version: latest.version + 1,
    status: ENUMS.LEGAL_DOCUMENT_STATUS.DRAFT,
    updatedBy: user._id,
  });
  await document.save();
  await writeAuditLog(
    user,
    ENUMS.AUDIT_LOG_ACTION.UPDATED_LEGAL_DOCUMENT,
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

  document.status = ENUMS.LEGAL_DOCUMENT_STATUS.PUBLISHED;
  document.effectiveDate = data.effectiveDate || new Date();
  document.updatedBy = user._id;
  await document.save();
  await writeAuditLog(
    user,
    ENUMS.AUDIT_LOG_ACTION.PUBLISHED_LEGAL_DOCUMENT,
    document,
  );

  return {
    success: true,
    message: "Legal document published successfully",
    data: document,
  };
};
