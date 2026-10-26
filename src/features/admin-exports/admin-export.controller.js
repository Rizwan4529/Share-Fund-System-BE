import { ENUMS, HTTP_STATUS } from "#/utils/constants.js";
import * as adminExportService from "./admin-export.service.js";

/** Sends the CSV as a browser download (filename via Content-Disposition). */
const sendCsv = (res, { filename, csv, rowCount }) => {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("X-Export-Row-Count", String(rowCount));
  res.setHeader("Cache-Control", "no-store"); // personal data
  return res.status(HTTP_STATUS.OK).send(csv);
};

const exportOf = (dataset) => async (req, res) =>
  sendCsv(
    res,
    await adminExportService.exportDataset(dataset, req.validatedQuery, req.user),
  );

export const exportParticipants = exportOf(ENUMS.EXPORT_DATASET.PARTICIPANTS);
export const exportEnrollments = exportOf(ENUMS.EXPORT_DATASET.ENROLLMENTS);
export const exportPayments = exportOf(ENUMS.EXPORT_DATASET.PAYMENTS);
