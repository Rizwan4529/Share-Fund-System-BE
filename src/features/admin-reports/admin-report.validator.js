import { ENUMS, OBJECT_ID, PAGINATION } from "#/utils/constants.js";
import { z } from "zod";

const oneOf = (values, message) =>
  z.string().refine((value) => values.includes(value), message);

const paging = {
  page: z.coerce.number().int().min(1).default(PAGINATION.DEFAULT_PAGE),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGINATION.MAX_LIMIT)
    .default(PAGINATION.DEFAULT_LIMIT),
  sortOrder: oneOf(Object.values(ENUMS.SORT_ORDER), "Invalid sort order").default(
    ENUMS.SORT_ORDER.DESC,
  ),
};

const dateRange = {
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
};

const purpose = oneOf(Object.values(ENUMS.PAYMENT_PURPOSE), "Invalid type");

export const listEnrollmentsQuerySchema = z.object({
  ...paging,
  ...dateRange,
  search: z.string().trim().max(100).optional(),
  type: purpose.optional(),
  status: oneOf(Object.values(ENUMS.ENROLLMENT_STATUS), "Invalid status").optional(),
  sortBy: oneOf(Object.values(ENUMS.ENROLLMENT_SORT_BY), "Invalid sort field").optional(),
});

export const listPaymentsQuerySchema = z.object({
  ...paging,
  ...dateRange,
  search: z.string().trim().max(100).optional(),
  purpose: purpose.optional(),
  status: oneOf(Object.values(ENUMS.PAYMENT_STATUS), "Invalid status").optional(),
  sortBy: oneOf(Object.values(ENUMS.ADMIN_PAYMENT_SORT_BY), "Invalid sort field").optional(),
});

export const revenueQuerySchema = z.object(dateRange);

export const paymentIdParamSchema = z.object({ id: OBJECT_ID });
