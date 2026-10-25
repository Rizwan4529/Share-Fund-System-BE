import { ENUMS, OBJECT_ID } from "#/utils/constants.js";
import { z } from "zod";

const purposeSchema = z
  .string()
  .refine(
    (value) => Object.values(ENUMS.PAYMENT_PURPOSE).includes(value),
    "Invalid payment purpose",
  );

// No amount field: amounts are always resolved server-side.
export const quoteSchema = z.object({
  purpose: purposeSchema,
  referenceId: z.string().trim().min(1, "Reference is required").max(100),
});

export const createCheckoutSessionSchema = quoteSchema.extend({
  // The checkout acknowledgment version the participant read and accepted.
  acknowledgmentVersion: z.number().int().positive().optional(),
});

export const paymentIdParamSchema = z.object({
  id: OBJECT_ID,
});
