import { randomUUID } from "node:crypto";
import {
  EMAIL_TEMPLATES,
  EMAIL_VERIFICATION_EXPIRY_LABEL,
  ENUMS,
  FRONTEND_ROUTES,
  HTTP_STATUS,
} from "#/utils/constants.js";
import { AppError } from "#/utils/appError.js";
import {
  signAccessToken,
  signEmailVerificationToken,
  verifyToken,
} from "#/utils/jwt.js";
import { assertAccountUsable } from "#/middleware/auth.middleware.js";
import { requirePublishedDocuments } from "#/features/legal-documents/legal-document.service.js";
import { recordAcceptancesForUser } from "#/features/legal-acceptances/legal-acceptance.service.js";
import { writeAuditLog } from "#/features/audit-logs/audit-log.service.js";
import User from "./user.model.js";
import { sendEmail } from "#/utils/email.js";
import {
  getFrontendBaseUrl,
  interpolate,
  renderEmailTemplate,
} from "#/utils/emailTemplate.js";

const SIGNUP_LEGAL_DOCUMENT_TYPES = [
  ENUMS.LEGAL_DOCUMENT_TYPE.TERMS,
  ENUMS.LEGAL_DOCUMENT_TYPE.PRIVACY,
  ENUMS.LEGAL_DOCUMENT_TYPE.FOUNDING_DISCLOSURE,
];

const CODE = ENUMS.AUTH_ERROR_CODE;

// Fields that never leave the server, even on the user's own record.
const PRIVATE_FIELDS = ["password", "emailVerificationNonce", "tokenVersion", "__v"];

const toSafeUser = (user) => {
  const safe = user.toObject();
  for (const field of PRIVATE_FIELDS) delete safe[field];
  return safe;
};

// getFrontendBaseUrl() adds the trailing slash, so FRONTEND_BASE_URL works
// with or without one (like the payment return URLs).
const buildVerificationUrl = (token) =>
  new URL(`${getFrontendBaseUrl()}${FRONTEND_ROUTES.VERIFY_EMAIL}${token}/`).toString();

const sendVerificationEmail = async (user, token) => {
  const verifyUrl = buildVerificationUrl(token);
  const vars = {
    firstName: user.firstName || "there",
    email: user.email,
    verifyUrl,
    expiresIn: EMAIL_VERIFICATION_EXPIRY_LABEL,
    preheader: EMAIL_TEMPLATES.VERIFY_EMAIL.PREHEADER,
  };

  return sendEmail({
    to: user.email,
    subject: EMAIL_TEMPLATES.VERIFY_EMAIL.SUBJECT,
    text: interpolate(EMAIL_TEMPLATES.VERIFY_EMAIL.TEXT, vars),
    html: renderEmailTemplate(EMAIL_TEMPLATES.VERIFY_EMAIL.FILE, vars),
  });
};

/**
 * Issues a fresh single-use verification link: a new nonce replaces any
 * previous one, so links from earlier emails stop working.
 */
const issueVerificationEmail = async (user, context) => {
  const nonce = randomUUID();
  await User.updateOne({ _id: user._id }, { $set: { emailVerificationNonce: nonce } });
  try {
    await sendVerificationEmail(user, signEmailVerificationToken(user._id, nonce));
  } catch (error) {
    console.error(`Verification email failed (${context}):`, error);
  }
};

export const loginUser = async ({ email, password, remember }) => {
  const user = await User.findOne({ email }).select("+password +tokenVersion");

  // One generic message for unknown email and wrong password (no enumeration).
  if (!user || !(await user.comparePassword(password)))
    throw new AppError("Invalid email or password", HTTP_STATUS.UNAUTHORIZED);

  // Only after the password is proven: suspended/closed accounts can't sign in.
  assertAccountUsable(user);

  const token = signAccessToken(user, { remember: Boolean(remember) });
  return {
    success: true,
    message: "Login Successful",
    data: { ...toSafeUser(user), token },
  };
};

/** Logout revokes every session for this user (tokenVersion bump). */
export const logoutUser = async (user) => {
  await User.updateOne({ _id: user._id }, { $inc: { tokenVersion: 1 } });
  return { success: true, message: "Logged out" };
};

/** Explicit duplicate checks so the client can point at the right field. */
const assertAvailable = async ({ email, phone }) => {
  const [emailTaken, phoneTaken] = await Promise.all([
    User.exists({ email }),
    User.exists({ phone }),
  ]);
  if (emailTaken)
    throw new AppError("An account with this email already exists.", HTTP_STATUS.CONFLICT, [
      { code: CODE.EMAIL_TAKEN, field: "email" },
    ]);
  if (phoneTaken)
    throw new AppError("An account with this phone number already exists.", HTTP_STATUS.CONFLICT, [
      { code: CODE.PHONE_TAKEN, field: "phone" },
    ]);
};

const createRegisteredUser = async (data, role) => {
  await assertAvailable(data);
  const user = new User({
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    password: data.password,
    phone: data.phone,
    country: data.country,
    address: data.address,
    stateRegion: data.stateRegion,
    preferredCurrency: data.preferredCurrency,
    role,
  });
  await user.save();
  await issueVerificationEmail(user, "registration");
  return user;
};

export const registerUser = async (data) => {
  const documents = await requirePublishedDocuments(SIGNUP_LEGAL_DOCUMENT_TYPES);
  const user = await createRegisteredUser(data, ENUMS.ROLES.USER);
  await recordAcceptancesForUser(
    user._id,
    documents,
    ENUMS.LEGAL_ACCEPTANCE_CONTEXT.SIGNUP,
  );

  return {
    success: true,
    message:
      "Registration successful! Please check your email to verify your account.",
    data: toSafeUser(user),
  };
};

/** Admin-only (see user.routes.js): an existing admin creates another admin. */
export const registerAdmin = async (data, createdBy) => {
  const user = await createRegisteredUser(data, ENUMS.ROLES.ADMIN);
  await writeAuditLog({
    actorId: createdBy._id,
    action: ENUMS.AUDIT_LOG_ACTION.CREATED_ADMIN,
    targetType: ENUMS.AUDIT_LOG_TARGET_TYPE.USER,
    targetId: user._id,
    afterValue: { email: user.email, role: user.role },
  });

  return {
    success: true,
    message:
      "Admin registration successful! Please check your email to verify your account.",
    data: toSafeUser(user),
  };
};

const invalidLink = (message) =>
  new AppError(message, HTTP_STATUS.BAD_REQUEST, [
    { code: CODE.VERIFICATION_LINK_INVALID },
  ]);

export const verifyEmail = async ({ token }) => {
  let decoded;
  try {
    decoded = verifyToken(token, ENUMS.TOKEN_TYPE.EMAIL_VERIFICATION);
  } catch (error) {
    if (error.name === "TokenExpiredError")
      throw new AppError(
        "This verification link has expired. Request a new one below.",
        HTTP_STATUS.BAD_REQUEST,
        [{ code: CODE.VERIFICATION_LINK_EXPIRED }],
      );
    throw invalidLink("This verification link isn't valid. Request a new one below.");
  }

  const user = await User.findById(decoded.userId).select("+emailVerificationNonce");
  if (!user) throw invalidLink("This verification link isn't valid. Request a new one below.");

  if (user.emailVerified)
    return {
      success: true,
      message: "Your email is already verified. You can log in.",
      data: { alreadyVerified: true },
    };

  if (!decoded.nonce || decoded.nonce !== user.emailVerificationNonce)
    throw invalidLink(
      "This verification link is no longer valid — a newer one was sent. Use the latest email or request a new link below.",
    );

  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        emailVerified: true,
        // Verifying never re-activates a suspended or closed account.
        ...(user.status === ENUMS.AUTH_STATUS.PENDING_VERIFICATION && {
          status: ENUMS.AUTH_STATUS.ACTIVE,
        }),
      },
      $unset: { emailVerificationNonce: 1 },
    },
  );

  return {
    success: true,
    message: "Email verified successfully",
    data: { alreadyVerified: false },
  };
};

/**
 * Always the same response, whether or not the email is registered, so this
 * endpoint can't be used to discover accounts. Only unverified accounts get
 * an email.
 */
export const resendVerificationLink = async ({ email }) => {
  const user = await User.findOne({ email });
  if (user && !user.emailVerified) await issueVerificationEmail(user, "resend");
  return {
    success: true,
    message:
      "If that email belongs to an account that still needs verifying, we've sent a new link.",
  };
};
