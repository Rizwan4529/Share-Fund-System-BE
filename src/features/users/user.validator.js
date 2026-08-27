import { z } from "zod";
import { parsePhoneNumberFromString } from "libphonenumber-js";
export const loginSchema = z.object({
  email: z.string().email("Please provide a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(40, "First name must be less that 40 characters"),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(40, "Last name must be less that 40 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be atleast 8 carachters long")
    .regex(/[A-Z]/, "Password must containt atleast one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(
      /[!@#$%^&*(),.?":{}|<>]/,
      "Password must contain at least one special character",
    ),
  phone: z.string().refine((value) => {
    const phoneNumber = parsePhoneNumberFromString(value);
    return phoneNumber?.isValid() ?? false;
  }, "Please provide a valid phone number"),
  country: z.string().min(1, "Country is required"),
  address: z.string().optional(),
  stateRegion: z.string().optional(),
  preferredCurrency: z.string().optional(),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

export const resendVerificationLinkSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});
