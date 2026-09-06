import nodemailer from "nodemailer";
import { AppError } from "./appError.js";
import { HTTP_STATUS } from "./constants.js";

const SMTP_HOST = process.env.BREVO_SMTP_HOST;
const SMTP_USER = process.env.BREVO_SMTP_USER;
const SMTP_PASS = process.env.BREVO_SMTP_KEY;
const SMTP_FROM = process.env.BREVO_SMTP_EMAIL;

const preferredPort = Number(process.env.BREVO_SMTP_PORT) || 465;
const fallbackPort = preferredPort === 465 ? 587 : 465;

const createTransporter = (port) =>
  nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });

const isConnectionError = (error) => {
  const code = String(error?.code || "");
  return (
    code === "ETIMEDOUT" ||
    code === "ECONNECTION" ||
    code === "ESOCKET" ||
    code === "ECONNRESET" ||
    code === "ENOTFOUND"
  );
};

let activeTransporter = createTransporter(preferredPort);
let activePort = preferredPort;

const switchTransporter = (port) => {
  activeTransporter = createTransporter(port);
  activePort = port;
};

export const verifyEmailConnection = async () => {
  for (const port of [preferredPort, fallbackPort]) {
    try {
      switchTransporter(port);
      await activeTransporter.verify();
      console.log(`Email transporter ready on port ${port}`);
      return;
    } catch (error) {
      console.error(
        `Email verify failed on port ${port}:`,
        error.code || "",
        error.message,
      );
    }
  }

  console.error(
    "Email transporter is unavailable. The API will keep running; emails may fail until SMTP is reachable.",
  );
};

const sendWithActiveTransporter = async ({ to, subject, html, text }) =>
  activeTransporter.sendMail({
    from: `"Share Fund System" <${SMTP_FROM}>`,
    to,
    subject,
    text,
    html,
  });

export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    return await sendWithActiveTransporter({ to, subject, html, text });
  } catch (firstError) {
    if (isConnectionError(firstError) && activePort !== fallbackPort) {
      console.error(
        `Email send failed on port ${activePort}, retrying ${fallbackPort}:`,
        firstError.message,
      );
      switchTransporter(fallbackPort);
      try {
        return await sendWithActiveTransporter({ to, subject, html, text });
      } catch (secondError) {
        throw new AppError(
          secondError.message || "Failed to send email",
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
        );
      }
    }

    throw new AppError(
      firstError.message || "Failed to send email",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
    );
  }
};
