import { ENUMS, OBJECT_ID } from "#/utils/constants.js";
import { z } from "zod";

const oneOf = (values, message) =>
  z.string().refine((value) => values.includes(value), message);

const amount = z.number().nonnegative("Amount cannot be negative");

const payeeSchema = z.object({
  name: z.string().trim().max(120).optional(),
  payeeType: oneOf(
    Object.values(ENUMS.SUCCESS_CENTER_PAYEE_TYPE),
    "Invalid payee type",
  ).optional(),
  verified: z.boolean().optional(),
});

// userId, categoryId, purchaseId and status are server-owned and stripped.
export const createSelectionSchema = z
  .object({
    programId: OBJECT_ID,
    obligationType: oneOf(
      Object.values(ENUMS.SUCCESS_CENTER_OBLIGATION_TYPE),
      "Invalid obligation type",
    ),
    goalAmount: amount.optional(),
    pricingSource: oneOf(
      Object.values(ENUMS.SUCCESS_CENTER_PRICING_SOURCE),
      "Invalid pricing source",
    ).optional(),
    verifiedQuoteAmount: amount.optional(),
    payee: payeeSchema.optional(),
  })
  .superRefine((data, ctx) => {
    const verified =
      data.pricingSource === ENUMS.SUCCESS_CENTER_PRICING_SOURCE.VERIFIED;
    if (verified && data.verifiedQuoteAmount == null) {
      ctx.addIssue({
        code: "custom",
        path: ["verifiedQuoteAmount"],
        message: "Verified quote amount is required when pricing is verified",
      });
    }
    if (!verified && data.verifiedQuoteAmount != null) {
      ctx.addIssue({
        code: "custom",
        path: ["verifiedQuoteAmount"],
        message: "Verified quote amount is only allowed when pricing is verified",
      });
    }
  });

export const listMySelectionsQuerySchema = z.object({
  status: oneOf(
    Object.values(ENUMS.SUCCESS_CENTER_SELECTION_STATUS),
    "Invalid selection status",
  ).default(ENUMS.SUCCESS_CENTER_SELECTION_STATUS.ACTIVE),
});

export const selectionIdParamSchema = z.object({
  id: OBJECT_ID,
});
