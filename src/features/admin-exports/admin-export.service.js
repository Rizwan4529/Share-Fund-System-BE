import { ENUMS } from "#/utils/constants.js";
import { toCsv } from "#/utils/csv.js";
import { writeAuditLog } from "#/features/audit-logs/audit-log.service.js";
import { findParticipantsForExport } from "#/features/admin-participants/admin-participant.service.js";
import {
  findEnrollmentsForExport,
  findPaymentsForExport,
} from "#/features/admin-reports/admin-report.service.js";

/*
 * Admin CSV exports. Rows come from the SAME filter/sort pipelines as the
 * matching list endpoints (only paging is dropped), so an export matches what
 * the admin is viewing. Columns are explicit — no password/auth fields can
 * leak — and every export is audit-logged (dataset, filters, row count).
 */

const DATASET = ENUMS.EXPORT_DATASET;

const PURPOSE_LABELS = {
  [ENUMS.PAYMENT_PURPOSE.FUNDING_ACCESS]: "Funding Access",
  [ENUMS.PAYMENT_PURPOSE.FOUNDER_TIER]: "Founder tier",
  [ENUMS.PAYMENT_PURPOSE.PROGRAM_ACTIVATION]: "Program activation",
};

const yesNo = (value) => (value ? "Yes" : "No");

const EXPORTS = {
  [DATASET.PARTICIPANTS]: {
    find: findParticipantsForExport,
    columns: [
      { header: "Name", value: (row) => row.name },
      { header: "Email", value: (row) => row.email },
      { header: "Country", value: (row) => row.country },
      { header: "Participant status", value: (row) => row.statusLabel },
      { header: "Founder tier", value: (row) => row.founderTier },
      { header: "Account status", value: (row) => row.accountStatus },
      { header: "Planning access", value: (row) => row.planningAccessStatus },
      { header: "Success Profile completion %", value: (row) => row.profileCompletion ?? 0 },
      { header: "Success Profile complete", value: (row) => yesNo(row.questionnaireComplete) },
      { header: "Selected centers", value: (row) => row.centersUsed },
      // null = no limit (admin-granted access without a purchase).
      { header: "Center allowance", value: (row) => row.centersTotal ?? "No limit" },
      { header: "Created", value: (row) => row.createdAt },
    ],
  },
  [DATASET.ENROLLMENTS]: {
    find: findEnrollmentsForExport,
    columns: [
      { header: "Participant", value: (row) => row.participant?.name },
      { header: "Email", value: (row) => row.participant?.email },
      { header: "Type", value: (row) => PURPOSE_LABELS[row.type] ?? row.type },
      { header: "Enrolled in", value: (row) => row.itemName },
      { header: "Category", value: (row) => row.itemDetail },
      { header: "Status", value: (row) => row.status },
      { header: "Date", value: (row) => row.date },
      { header: "Planning access", value: (row) => row.planningAccessStatus },
      { header: "Payment status", value: (row) => row.paymentStatus },
      { header: "Payment amount", value: (row) => row.payment?.amount },
      { header: "Payment currency", value: (row) => row.payment?.currency },
    ],
  },
  [DATASET.PAYMENTS]: {
    find: findPaymentsForExport,
    columns: [
      { header: "Participant", value: (row) => row.participant?.name },
      { header: "Email", value: (row) => row.participant?.email },
      { header: "Purpose", value: (row) => PURPOSE_LABELS[row.purpose] ?? row.purpose },
      { header: "Description", value: (row) => row.description },
      { header: "Amount", value: (row) => row.amount },
      { header: "Currency", value: (row) => row.currency },
      { header: "Status", value: (row) => row.status },
      { header: "Payment date", value: (row) => row.paymentDate },
      { header: "Created", value: (row) => row.createdAt },
      { header: "Transaction reference", value: (row) => row.providerTransactionRef },
      { header: "Refund status", value: (row) => row.refundStatus },
      { header: "Dispute status", value: (row) => row.disputeStatus },
      { header: "Failure reason", value: (row) => row.failureReason },
    ],
  },
};

/** Only the filters actually applied, for the audit record. */
const appliedFilters = (filters) =>
  Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== ""),
  );

/** @returns {{ filename: string, csv: string, rowCount: number }} */
export const exportDataset = async (dataset, filters, admin) => {
  const { find, columns } = EXPORTS[dataset];
  const rows = await find(filters);
  const csv = toCsv(columns, rows);

  await writeAuditLog({
    actorId: admin._id,
    action: ENUMS.AUDIT_LOG_ACTION.EXPORTED_DATA,
    targetType: ENUMS.AUDIT_LOG_TARGET_TYPE.DATA_EXPORT,
    afterValue: { dataset, filters: appliedFilters(filters), rowCount: rows.length },
  });

  const date = new Date().toISOString().slice(0, 10);
  return { filename: `sfs-${dataset}-${date}.csv`, csv, rowCount: rows.length };
};
