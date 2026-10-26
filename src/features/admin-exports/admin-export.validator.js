import { listParticipantsQuerySchema } from "#/features/admin-participants/admin-participant.validator.js";
import {
  listEnrollmentsQuerySchema,
  listPaymentsQuerySchema,
} from "#/features/admin-reports/admin-report.validator.js";

// Same filters/sort as the matching list endpoints; exports have no paging.
const NO_PAGING = { page: true, limit: true };

export const exportParticipantsQuerySchema = listParticipantsQuerySchema.omit(NO_PAGING);
export const exportEnrollmentsQuerySchema = listEnrollmentsQuerySchema.omit(NO_PAGING);
export const exportPaymentsQuerySchema = listPaymentsQuerySchema.omit(NO_PAGING);
