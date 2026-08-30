import express from "express";

import { authenticate } from "#/middleware/auth.middleware.js";
import { listSuccessCenterPrograms } from "./success-center-program.controller.js";

const router = express.Router();

router.use(authenticate);
router.get("/", listSuccessCenterPrograms);

export default router;
