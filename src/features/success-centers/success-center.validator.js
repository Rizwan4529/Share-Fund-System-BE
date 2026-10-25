import { OBJECT_ID } from "#/utils/constants.js";
import { z } from "zod";

export const categoryIdParamSchema = z.object({
  categoryId: OBJECT_ID,
});

export const programIdParamSchema = z.object({
  programId: OBJECT_ID,
});
