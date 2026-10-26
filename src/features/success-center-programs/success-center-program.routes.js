import { validate, validateParams, validateQuery } from "#/middleware/validate.middleware.js";
import express from "express";
import { authenticate, authorize } from "#/middleware/auth.middleware.js";
import { ENUMS } from "#/utils/constants.js";
import {
  createSuccessCenterProgramSchema,
  listSuccessCenterProgramsQuerySchema,
  successCenterProgramIdParamSchema,
  updateSuccessCenterProgramSchema,
} from "./success-center-program.validator.js";
import {
  createSuccessCenterProgram,
  deleteSuccessCenterProgram,
  getSuccessCenterProgramById,
  listSuccessCenterPrograms,
  updateSuccessCenterProgram,
} from "./success-center-program.controller.js";

const router = express.Router();

// The participant catalog is served by /success-centers (published only).
router.use(authenticate, authorize(ENUMS.ROLES.ADMIN));

router.get(
  "/",
  validateQuery(listSuccessCenterProgramsQuerySchema),
  listSuccessCenterPrograms,
);
router.get(
  "/:id",
  validateParams(successCenterProgramIdParamSchema),
  getSuccessCenterProgramById,
);
router.post(
  "/",
  validate(createSuccessCenterProgramSchema),
  createSuccessCenterProgram,
);
router.patch(
  "/:id",
  validateParams(successCenterProgramIdParamSchema),
  validate(updateSuccessCenterProgramSchema),
  updateSuccessCenterProgram,
);
router.delete(
  "/:id",
  validateParams(successCenterProgramIdParamSchema),
  deleteSuccessCenterProgram,
);

export default router;
