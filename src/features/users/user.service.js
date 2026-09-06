import {
  EMAIL_TEMPLATES,
  ENUMS,
  FRONTEND_ROUTES,
  HTTP_STATUS,
} from "#/utils/constants.js";
import { AppError } from "#/utils/appError.js";
import { signUserToken, verifyUserToken } from "#/utils/jwt.js";
import { requirePublishedDocuments } from "#/features/legal-documents/legal-document.service.js";
import { recordAcceptancesForUser } from "#/features/legal-acceptances/legal-acceptance.service.js";
import User from "./user.model.js";
import { sendEmail } from "#/utils/email.js";
import { interpolate, renderEmailTemplate } from "#/utils/emailTemplate.js";

const SIGNUP_LEGAL_DOCUMENT_TYPES = [
  ENUMS.LEGAL_DOCUMENT_TYPE.TERMS,
  ENUMS.LEGAL_DOCUMENT_TYPE.PRIVACY,
  ENUMS.LEGAL_DOCUMENT_TYPE.FOUNDING_DISCLOSURE,
];

const buildVerificationUrl = (token) =>
  new URL(
    `${process.env.FRONTEND_BASE_URL}${FRONTEND_ROUTES.VERIFY_EMAIL}${token}/`,
  ).toString();

const sendVerificationEmail = async (user, token) => {
  const verifyUrl = buildVerificationUrl(token);
  const vars = {
    firstName: user.firstName || "there",
    email: user.email,
    verifyUrl,
    preheader: EMAIL_TEMPLATES.VERIFY_EMAIL.PREHEADER,
  };

  return sendEmail({
    to: user.email,
    subject: EMAIL_TEMPLATES.VERIFY_EMAIL.SUBJECT,
    text: interpolate(EMAIL_TEMPLATES.VERIFY_EMAIL.TEXT, vars),
    html: renderEmailTemplate(EMAIL_TEMPLATES.VERIFY_EMAIL.FILE, vars),
  });
};

export const loginUser = async (data) => {
  const { email, password } = data;
  const user = await User.findOne({ email });

  if (!user) {
    throw new AppError("Invalid email or password", HTTP_STATUS.UNAUTHORIZED);
  }

  const isPasswordCorrect = await user.comparePassword(password);
  if (!isPasswordCorrect) {
    throw new AppError("Invalid email or password", HTTP_STATUS.UNAUTHORIZED);
  }

  const token = signUserToken(user._id);

  const userSafe = user.toObject();
  delete userSafe.password;

  return {
    success: true,
    message: "Login Successful",
    data: { ...userSafe, token },
  };
};

const createRegisteredUser = async (data, role) => {
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

  const token = signUserToken(user._id, "1h");
  try {
    await sendVerificationEmail(user, token);
  } catch (error) {
    console.error("Verification email failed after registration:", error);
  }
  const safeUser = user.toObject();
  delete safeUser?.password;
  return safeUser;
};

export const registerUser = async (data) => {
  const documents = await requirePublishedDocuments(SIGNUP_LEGAL_DOCUMENT_TYPES);
  const safeUser = await createRegisteredUser(data, ENUMS.ROLES.USER);
  await recordAcceptancesForUser(
    safeUser._id,
    documents,
    ENUMS.LEGAL_ACCEPTANCE_CONTEXT.SIGNUP,
  );

  return {
    success: true,
    message:
      "Registration successful! Please check your email to verify your account.",
    data: safeUser,
  };
};

export const registerAdmin = async (data) => {
  const safeUser = await createRegisteredUser(data, ENUMS.ROLES.ADMIN);

  return {
    success: true,
    message:
      "Admin registration successful! Please check your email to verify your account.",
    data: safeUser,
  };
};

export const verifyEmail = async (data) => {
  const { token } = data;

  const decoded = verifyUserToken(token);
  const user = await User.findByIdAndUpdate(
    decoded.userId,
    {
      $set: { emailVerified: true, status: ENUMS.AUTH_STATUS.ACTIVE },
    },
    { new: true }, //tells mongodb to send the new updated document
  );

  if (!user)
    throw new AppError("Invalid or expired token", HTTP_STATUS.UNAUTHORIZED);

  const safeUser = user.toObject();
  delete safeUser.password;
  return {
    success: true,
    message: "Email verified successfully",
    // data: safeUser,
  };
};

export const resendVerificationLink = async (data) => {
  const { email } = data;
  const user = await User.findOne({ email });
  if (!user) throw new AppError("User does not exist", HTTP_STATUS.NOT_FOUND);
  const token = signUserToken(user._id);
  try {
    await sendVerificationEmail(user, token);
  } catch (error) {
    console.error("Verification email failed on resend:", error);
  }
  return {
    success: true,
    message:
      "Verification link resent! please check your email to verify your account",
  };
};
