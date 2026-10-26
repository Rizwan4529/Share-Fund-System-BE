import { z } from "zod";
import { parsePhoneNumberFromString } from "libphonenumber-js";

// Emails are trimmed and lower-cased before validation, everywhere.
const email = (message) => z.string().trim().toLowerCase().email(message);

export const loginSchema = z.object({
  email: email("Please provide a valid email address"),
  password: z.string().min(1, "Password is required"),
  // "Remember me": issues the longer-lived session token.
  remember: z.boolean().optional(),
});

export const registerSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "First name is required")
    .max(40, "First name must be 40 characters or fewer"),
  lastName: z
    .string()
    .trim()
    .min(1, "Last name is required")
    .max(40, "Last name must be 40 characters or fewer"),
  email: email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(
      /[!@#$%^&*(),.?":{}|<>]/,
      "Password must contain at least one special character",
    ),
  phone: z.string().trim().refine((value) => {
    const phoneNumber = parsePhoneNumberFromString(value);
    return phoneNumber?.isValid() ?? false;
  }, "Please provide a valid phone number"),
  country: z.string().trim().min(1, "Country is required"),
  address: z.string().optional(),
  stateRegion: z.string().optional(),
  preferredCurrency: z.string().optional(),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

export const resendVerificationLinkSchema = z.object({
  email: email("Please enter a valid email address"),
});
