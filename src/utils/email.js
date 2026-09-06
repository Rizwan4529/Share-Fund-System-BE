import nodemailer from "nodemailer";
import { AppError } from "./appError.js";
import { HTTP_STATUS } from "./constants.js";

const transporter = nodemailer.createTransport({
  host: process.env.BREVO_SMTP_HOST,
  port: Number(process.env.BREVO_SMTP_PORT),
  secure: Number(process.env.BREVO_SMTP_PORT) === 465,
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_KEY,
  },
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 15_000,
});

export const verifyEmailConnection = async () => {
  try {
    await transporter.verify();
    console.log("Email transporter ready");
  } catch (error) {
    console.error(
      "Email transporter is unavailable. The API will keep running; emails may fail until SMTP is reachable.",
      error.message,
    );
  }
};

export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    return await transporter.sendMail({
      from: `"Share Fund System" <${process.env.BREVO_SMTP_EMAIL}>`,
      to,
      subject,
      text,
      html,
    });
  } catch (error) {
    throw new AppError(
      error.message || "Failed to send email",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
    );
  }
};
