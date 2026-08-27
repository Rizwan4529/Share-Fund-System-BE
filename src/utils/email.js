import nodemailer from "nodemailer";
import { AppError } from "./appError.js";

const transporter = nodemailer.createTransport({
  host: process.env.BREVO_SMTP_HOST,
  port: Number(process.env.BREVO_SMTP_PORT),
  secure: false, // false for port 587 (STARTTLS), true only for 465
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_KEY,
  },
});

export const verifyEmailConnection = async () => {
  await transporter.verify();
  console.log("Email transporter ready");
};

export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    return transporter.sendMail({
      from: `"Share Fund System" <${process.env.BREVO_SMTP_EMAIL}>`,
      to,
      subject,
      text,
      html,
    });
  } catch (error) {
    throw new AppError(error);
  }
};
