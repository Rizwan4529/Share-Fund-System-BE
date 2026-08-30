import { validate } from "#/middleware/validate.middleware.js";
import express from "express";
import {
  loginSchema,
  registerSchema,
  resendVerificationLinkSchema,
  verifyEmailSchema,
} from "./user.validator.js";
import {
  loginUser,
  registerAdmin,
  registerUser,
  resendVerificationLink,
  verifyEmail,
} from "./user.controller.js";

const router = express.Router();

router.post("/login/", validate(loginSchema), loginUser);
router.post("/register/", validate(registerSchema), registerUser);
router.post("/register-admin/", validate(registerSchema), registerAdmin);
router.post("/verify-email", validate(verifyEmailSchema), verifyEmail);
router.post(
  "/resend-link",
  validate(resendVerificationLinkSchema),
  resendVerificationLink,
);
export default router;
