import LegalAcceptance from "./legal-acceptance.model.js";
import { getPublishedLegalDocument } from "#/features/legal-documents/legal-document.service.js";

const DOCUMENT_FIELDS = "documentType version title status effectiveDate";

const populateAcceptance = (query) =>
  query.populate("legalDocumentId", DOCUMENT_FIELDS);

const findAcceptancesByUser = async (userId) => {
  return populateAcceptance(
    LegalAcceptance.find({ userId }).sort({ acceptedAt: -1 }),
  );
};

const latestAcceptanceForType = async (userId, documentType) => {
  return LegalAcceptance.findOne({ userId, documentType }).sort({
    acceptedAt: -1,
  });
};

const buildCurrentVersionCheck = async (userId, documentType) => {
  const currentDocument = await getPublishedLegalDocument(documentType);
  const currentAcceptance = await LegalAcceptance.findOne({
    userId,
    legalDocumentId: currentDocument._id,
  }).sort({ acceptedAt: -1 });
  const latestAcceptance =
    currentAcceptance ||
    (await latestAcceptanceForType(userId, documentType));

  return {
    accepted: Boolean(currentAcceptance),
    documentType,
    currentVersion: currentDocument.version,
    acceptedVersion: latestAcceptance?.documentVersion ?? null,
    acceptedAt: latestAcceptance?.acceptedAt ?? null,
    context: latestAcceptance?.context ?? null,
  };
};

export const hasAcceptedCurrentVersion = async (userId, documentType) => {
  const currentDocument = await getPublishedLegalDocument(documentType);
  const acceptance = await LegalAcceptance.findOne({
    userId,
    legalDocumentId: currentDocument._id,
  });
  return Boolean(acceptance);
};

export const recordAcceptancesForUser = async (userId, documents, context) => {
  if (!documents.length) return [];
  return LegalAcceptance.insertMany(
    documents.map((document) => ({
      userId,
      legalDocumentId: document._id,
      documentType: document.documentType,
      documentVersion: document.version,
      context,
    })),
  );
};

export const recordLegalAcceptance = async (data, user) => {
  const document = await getPublishedLegalDocument(data.documentType);

  const acceptance = new LegalAcceptance({
    userId: user._id,
    legalDocumentId: document._id,
    documentType: document.documentType,
    documentVersion: document.version,
    context: data.context,
  });
  await acceptance.save();

  const populated = await populateAcceptance(
    LegalAcceptance.findById(acceptance._id),
  );

  return {
    success: true,
    message: "Legal document accepted successfully",
    data: populated,
  };
};

export const getMyLegalAcceptances = async (user) => {
  const acceptances = await findAcceptancesByUser(user._id);
  return {
    success: true,
    message: "Legal acceptances retrieved successfully",
    data: acceptances,
  };
};

export const getUserLegalAcceptances = async (userId) => {
  const acceptances = await findAcceptancesByUser(userId);
  return {
    success: true,
    message: "Legal acceptances retrieved successfully",
    data: acceptances,
  };
};

export const checkMyCurrentAcceptance = async (documentType, user) => {
  const data = await buildCurrentVersionCheck(user._id, documentType);
  return {
    success: true,
    message: data.accepted
      ? "Current version has been accepted"
      : "Current version has not been accepted",
    data,
  };
};

export const checkUserCurrentAcceptance = async (userId, documentType) => {
  const data = await buildCurrentVersionCheck(userId, documentType);
  return {
    success: true,
    message: data.accepted
      ? "Current version has been accepted"
      : "Current version has not been accepted",
    data,
  };
};
