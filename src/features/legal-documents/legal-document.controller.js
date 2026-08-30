import { HTTP_STATUS } from "#/utils/constants.js";
import * as legalDocumentService from "./legal-document.service.js";

export const listLegalDocuments = async (req, res) => {
  const response = await legalDocumentService.listLegalDocuments(req.user);
  return res.status(HTTP_STATUS.OK).json(response);
};

export const getLegalDocumentByType = async (req, res) => {
  const response = await legalDocumentService.getLegalDocumentByType(
    req.params.documentType,
  );
  return res.status(HTTP_STATUS.OK).json(response);
};

export const getLegalDocumentVersion = async (req, res) => {
  const response = await legalDocumentService.getLegalDocumentVersion(
    req.params.documentType,
    Number(req.params.version),
    req.user,
  );
  return res.status(HTTP_STATUS.OK).json(response);
};

export const listLegalDocumentVersions = async (req, res) => {
  const response = await legalDocumentService.listLegalDocumentVersions(
    req.params.documentType,
  );
  return res.status(HTTP_STATUS.OK).json(response);
};

export const createLegalDocument = async (req, res) => {
  const response = await legalDocumentService.createLegalDocument(
    req.body,
    req.user,
  );
  return res.status(HTTP_STATUS.CREATED).json(response);
};

export const updateLegalDocument = async (req, res) => {
  const response = await legalDocumentService.updateLegalDocument(
    req.params.documentType,
    req.body,
    req.user,
  );
  return res.status(HTTP_STATUS.OK).json(response);
};

export const publishLegalDocument = async (req, res) => {
  const response = await legalDocumentService.publishLegalDocument(
    req.params.documentType,
    Number(req.params.version),
    req.body,
    req.user,
  );
  return res.status(HTTP_STATUS.OK).json(response);
};
