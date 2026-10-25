import express from "express";
import { authenticate } from "#/middleware/auth.middleware.js";
import { HTTP_STATUS } from "#/utils/constants.js";
import { getMyStatus } from "./participant-status.service.js";
import { getMyDashboard } from "./participant-dashboard.service.js";

// Mounted at /api/v1/me — owner-only views of the logged-in participant.
const router = express.Router();
router.use(authenticate);

router.get("/status", async (req, res) => {
  const response = await getMyStatus(req.user);
  return res.status(HTTP_STATUS.OK).json(response);
});

// Everything the participant dashboard shows, in one payload.
router.get("/dashboard", async (req, res) => {
  const response = await getMyDashboard(req.user);
  return res.status(HTTP_STATUS.OK).json(response);
});

export default router;
