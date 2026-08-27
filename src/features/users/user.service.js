import jwt from "jsonwebtoken";
import {
  EMAIL_TEMPLATES,
  ENUMS,
  FRONTEND_ROUTES,
  HTTP_STATUS,
} from "#/utils/constants.js";
import { AppError } from "#/utils/appError.js";
import User from "./user.model.js";
import { sendEmail } from "#/utils/email.js";
import { interpolate, renderEmailTemplate } from "#/utils/emailTemplate.js";

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

  const token = jwt.sign(
    {
      userId: user._id,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRY_DATE,
    },
  );

  const userSafe = user.toObject();
  delete userSafe.password;

  return {
    success: true,
    message: "Login Successful",
    data: { ...userSafe, token },
  };
};

export const registerUser = async (data) => {
  // const {
  // firstName,
  // lastName,
  // email,
  // password,
  // phone,
  // country,
  // address,
  // stateRegion,
  // preferredCurrency,
  // } = data;

  const user = new User(data);
  await user.save();

  const token = jwt.sign(
    {
      userId: user._id,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "1h",
    },
  );
  await sendVerificationEmail(user, token);
  const safeUser = user.toObject();
  delete safeUser?.password;

  return {
    success: true,
    message:
      "Registration successful! Please check your email to verify your account.",
    data: safeUser,
  };
};

export const verifyEmail = async (data) => {
  const { token } = data;

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
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
  const token = jwt.sign(
    {
      userId: user._id,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRY_DATE,
    },
  );
  await sendVerificationEmail(user, token);
  return {
    success: true,
    message:
      "Verification link resent! please check your email to verify your account",
  };
};
