import {
  ENUMS,
  OBJECT_ID,
  PAGINATION,
  RECOMMENDATION_ONE_TIME_KEY,
} from "#/utils/constants.js";
import { z } from "zod";

const oneOf = (values, message) =>
  z.string().refine((value) => values.includes(value), message);

export const calculateActivationSchema = z.object({
  selectionId: OBJECT_ID,
});

export const selectionIdParamSchema = z.object({
  selectionId: OBJECT_ID,
});

/* --- Admin review --- */

export const recommendationIdParamSchema = z.object({
  id: OBJECT_ID,
});

export const listRecommendationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(PAGINATION.DEFAULT_PAGE),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGINATION.MAX_LIMIT)
    .default(PAGINATION.DEFAULT_LIMIT),
  search: z.string().trim().max(100).optional(),
  reviewStatus: oneOf(
    Object.values(ENUMS.RECOMMENDATION_REVIEW_STATUS),
    "Invalid review status",
  ).optional(),
  affordabilityStatus: oneOf(
    Object.values(ENUMS.RECOMMENDATION_AFFORDABILITY_STATUS),
    "Invalid affordability status",
  ).optional(),
  sortBy: oneOf(
    Object.values(ENUMS.RECOMMENDATION_SORT_BY),
    "Invalid sort field",
  ).optional(),
  sortOrder: oneOf(Object.values(ENUMS.SORT_ORDER), "Invalid sort order").default(
    ENUMS.SORT_ORDER.DESC,
  ),
});

// Override values: sanity checks only (types, positive, real dates).
const amount = z.number({ error: "Amounts must be numbers" }).positive("Amounts must be greater than 0");
// Bound is input sanity (100 years), not a business rule.
const months = z.number().int("Months must be a whole number").min(1).max(1200);
const date = z
  .union([z.iso.date(), z.iso.datetime({ offset: true })], {
    error: "Dates must be ISO dates (YYYY-MM-DD)",
  })
  .transform((value) => new Date(value));

const projectionOverrides = z.object({
  growthPeriodCompletionDate: date.optional(),
  eligibilityDate: date.optional(),
  activationCompletionDate: date.optional(),
  estimatedFundingRange: z
    .object({ earliest: date.optional(), latest: date.optional() })
    .optional(),
});

const pacedOverrides = z.object({
  totalActivationRequirement: amount.optional(),
  scheduledPayment: amount.optional(),
  months: months.optional(),
  projection: projectionOverrides.optional(),
});

// Paid in full, so no schedule to override.
const oneTimeOverrides = z.object({
  totalActivationRequirement: amount.optional(),
  projection: projectionOverrides.optional(),
});

export const adjustRecommendationSchema = z
  .object({
    reason: z
      .string({ error: "An adjustment reason is required" })
      .trim()
      .min(3, "Please give a reason for the adjustment")
      .max(1000),
    affordabilityStatus: oneOf(
      Object.values(ENUMS.RECOMMENDATION_AFFORDABILITY_STATUS),
      "Invalid affordability status",
    ).optional(),
    options: z
      .object({
        ...Object.fromEntries(
          Object.values(ENUMS.RECOMMENDATION_LABEL).map((label) => [
            label,
            pacedOverrides.optional(),
          ]),
        ),
        [RECOMMENDATION_ONE_TIME_KEY]: oneTimeOverrides.optional(),
      })
      .optional(),
  })
  .refine(
    (data) => data.affordabilityStatus !== undefined || data.options !== undefined,
    "At least one value to adjust is required",
  );

// Body is optional for reset.
export const resetRecommendationSchema = z
  .object({ reason: z.string().trim().max(1000).optional() })
  .optional();
