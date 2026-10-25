import { ENUMS, OBJECT_ID, PAGINATION } from "#/utils/constants.js";
import { z } from "zod";

const oneOf = (values, message) =>
  z.string().refine((value) => values.includes(value), message);

export const listParticipantsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(PAGINATION.DEFAULT_PAGE),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGINATION.MAX_LIMIT)
    .default(PAGINATION.DEFAULT_LIMIT),
  search: z.string().trim().max(100).optional(),
  status: oneOf(
    Object.values(ENUMS.PARTICIPANT_STANDING),
    "Invalid participant status",
  ).optional(),
  questionnaire: oneOf(
    Object.values(ENUMS.PARTICIPANT_QUESTIONNAIRE_FILTER),
    "Invalid questionnaire filter",
  ).optional(),
  // Maps to User.status.
  accountStatus: oneOf(
    [
      ENUMS.AUTH_STATUS.ACTIVE,
      ENUMS.AUTH_STATUS.PENDING_VERIFICATION,
      ENUMS.AUTH_STATUS.SUSPENDED,
      ENUMS.AUTH_STATUS.CLOSED,
    ],
    "Invalid account status",
  ).optional(),
  sortBy: oneOf(
    Object.values(ENUMS.PARTICIPANT_SORT_BY),
    "Invalid sort field",
  ).optional(),
  sortOrder: oneOf(Object.values(ENUMS.SORT_ORDER), "Invalid sort order")
    .default(ENUMS.SORT_ORDER.DESC),
});

export const participantIdParamSchema = z.object({
  userId: OBJECT_ID,
});

export const updateParticipantStatusSchema = z.object({
  status: oneOf(
    Object.values(ENUMS.ADMIN_SETTABLE_ACCOUNT_STATUS),
    "Status must be active, suspended or closed",
  ),
});

// Safe subset of existing access fields an admin may adjust by hand.
export const updateParticipantAccessSchema = z
  .object({
    founderTier: oneOf(Object.values(ENUMS.FOUNDER_TIER), "Invalid founder tier").optional(),
    foundingParticipant: z.boolean().optional(),
    planningAccessStatus: oneOf(
      Object.values(ENUMS.PLANNING_ACCESS_STATUS),
      "Invalid planning access status",
    ).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, "At least one field is required");
