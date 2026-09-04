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

router.use(authenticate);

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
  authorize(ENUMS.ROLES.ADMIN),
  validate(createSuccessCenterProgramSchema),
  createSuccessCenterProgram,
);
router.patch(
  "/:id",
  authorize(ENUMS.ROLES.ADMIN),
  validateParams(successCenterProgramIdParamSchema),
  validate(updateSuccessCenterProgramSchema),
  updateSuccessCenterProgram,
);
router.delete(
  "/:id",
  authorize(ENUMS.ROLES.ADMIN),
  validateParams(successCenterProgramIdParamSchema),
  deleteSuccessCenterProgram,
);

export default router;
