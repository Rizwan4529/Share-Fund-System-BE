import { OBJECT_ID } from "#/utils/constants.js";
import { z } from "zod";

export const calculateActivationSchema = z.object({
  selectionId: OBJECT_ID,
});

export const selectionIdParamSchema = z.object({
  selectionId: OBJECT_ID,
});
