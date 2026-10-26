import { validate } from "#/middleware/validate.middleware.js";
import { authenticate, authorize } from "#/middleware/auth.middleware.js";
import { bodyEmail, rateLimit } from "#/middleware/rate-limit.middleware.js";
import { AUTH_RATE_LIMITS, ENUMS } from "#/utils/constants.js";
import express from "express";
import {
  loginSchema,
  registerSchema,
  resendVerificationLinkSchema,
  verifyEmailSchema,
} from "./user.validator.js";
import {
  loginUser,
  logoutUser,
  registerAdmin,
  registerUser,
  resendVerificationLink,
  verifyEmail,
} from "./user.controller.js";

const TOO_MANY = "Too many attempts. Please wait a few minutes and try again.";

const limitLoginPerAccount = rateLimit({
  ...AUTH_RATE_LIMITS.LOGIN_PER_ACCOUNT,
  key: bodyEmail,
  message: TOO_MANY,
});
const limitLoginPerIp = rateLimit({
  ...AUTH_RATE_LIMITS.LOGIN_PER_IP,
  key: (req) => req.ip,
  message: TOO_MANY,
});
const limitRegister = rateLimit({
  ...AUTH_RATE_LIMITS.REGISTER_PER_IP,
  key: (req) => req.ip,
  message: "Too many sign-up attempts from this network. Please try again later.",
});
const limitResendPerEmail = rateLimit({
  ...AUTH_RATE_LIMITS.RESEND_PER_EMAIL,
  key: bodyEmail,
  message: "We've already sent a few links to this address. Please check your inbox or try again in a few minutes.",
});
const limitResendPerIp = rateLimit({
  ...AUTH_RATE_LIMITS.RESEND_PER_IP,
  key: (req) => req.ip,
  message: TOO_MANY,
});
const limitVerify = rateLimit({
  ...AUTH_RATE_LIMITS.VERIFY_PER_IP,
  key: (req) => req.ip,
  message: TOO_MANY,
});

const router = express.Router();

router.post("/login/", limitLoginPerIp, limitLoginPerAccount, validate(loginSchema), loginUser);
router.post("/logout", authenticate, logoutUser);
router.post("/register/", limitRegister, validate(registerSchema), registerUser);
// Only an existing admin can create another admin (first admin: npm run create-admin).
router.post(
  "/register-admin/",
  authenticate,
  authorize(ENUMS.ROLES.ADMIN),
  validate(registerSchema),
  registerAdmin,
);
router.post("/verify-email", limitVerify, validate(verifyEmailSchema), verifyEmail);
router.post(
  "/resend-link",
  limitResendPerIp,
  limitResendPerEmail,
  validate(resendVerificationLinkSchema),
  resendVerificationLink,
);
export default router;
