import { ENUMS, OBJECT_ID } from "#/utils/constants.js";
import { z } from "zod";

export const listAuditLogsQuerySchema = z.object({
  actorId: OBJECT_ID.optional(),
  action: z
    .string()
    .refine(
      (value) => Object.values(ENUMS.AUDIT_LOG_ACTION).includes(value),
      "Invalid action",
    )
    .optional(),
  targetType: z
    .string()
    .refine(
      (value) => Object.values(ENUMS.AUDIT_LOG_TARGET_TYPE).includes(value),
      "Invalid target type",
    )
    .optional(),
  targetId: OBJECT_ID.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
});
