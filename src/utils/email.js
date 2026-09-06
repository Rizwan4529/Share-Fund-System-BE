import nodemailer from "nodemailer";
import { AppError } from "./appError.js";
import { HTTP_STATUS } from "./constants.js";

const SMTP_HOST = process.env.BREVO_SMTP_HOST;
const SMTP_USER = process.env.BREVO_SMTP_USER;
const SMTP_PASS = process.env.BREVO_SMTP_KEY;
const SMTP_FROM = process.env.BREVO_SMTP_EMAIL;
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

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
    connectionTimeout: 8_000,
    greetingTimeout: 8_000,
    socketTimeout: 10_000,
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

const sendViaBrevoApi = async ({ to, subject, html, text }) => {
  if (!BREVO_API_KEY) return null;

  const response = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: {
        name: "Share Fund System",
        email: SMTP_FROM,
      },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      payload.message || `Brevo API failed with status ${response.status}`,
    );
  }

  console.log("Email sent via Brevo API", payload.messageId || "");
  return payload;
};

const sendViaSmtp = async ({ to, subject, html, text }) => {
  const mail = {
    from: `"Share Fund System" <${SMTP_FROM}>`,
    to,
    subject,
    text,
    html,
  };

  try {
    return await activeTransporter.sendMail(mail);
  } catch (firstError) {
    if (!isConnectionError(firstError) || activePort === fallbackPort) {
      throw firstError;
    }

    console.error(
      `Email send failed on port ${activePort}, retrying ${fallbackPort}:`,
      firstError.message,
    );
    switchTransporter(fallbackPort);
    return activeTransporter.sendMail(mail);
  }
};

export const verifyEmailConnection = async () => {
  if (BREVO_API_KEY) {
    try {
      const response = await fetch("https://api.brevo.com/v3/account", {
        headers: { accept: "application/json", "api-key": BREVO_API_KEY },
      });
      if (response.ok) {
        console.log("Email ready via Brevo HTTP API");
        return;
      }
      const payload = await response.json().catch(() => ({}));
      console.error(
        "Brevo API key was rejected:",
        payload.message || response.status,
      );
    } catch (error) {
      console.error("Brevo API check failed:", error.message);
    }
  }

  for (const port of [preferredPort, fallbackPort]) {
    try {
      switchTransporter(port);
      await activeTransporter.verify();
      console.log(`Email transporter ready on SMTP port ${port}`);
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
    "SMTP is blocked or unreachable. Add BREVO_API_KEY on Railway to send mail over HTTPS.",
  );
};

export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const apiResult = await sendViaBrevoApi({ to, subject, html, text });
    if (apiResult) return apiResult;
    return await sendViaSmtp({ to, subject, html, text });
  } catch (error) {
    throw new AppError(
      error.message || "Failed to send email",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
    );
  }
};
