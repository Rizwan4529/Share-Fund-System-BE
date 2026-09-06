import jwt from "jsonwebtoken";
import { HTTP_STATUS } from "./constants.js";
import { AppError } from "./appError.js";

const DEFAULT_EXPIRY = "7d";

const cleanExpiry = (value) => {
  const cleaned = String(value || DEFAULT_EXPIRY)
    .trim()
    .replace(/^["']|["']$/g, "");
  return cleaned || DEFAULT_EXPIRY;
};

export const verifyUserToken = (token) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AppError(
      "Server is missing JWT_SECRET",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
    );
  }
  return jwt.verify(token, secret);
};

export const signUserToken = (userId, expiresIn = process.env.JWT_EXPIRY_DATE) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AppError(
      "Server is missing JWT_SECRET",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
    );
  }

  try {
    return jwt.sign({ userId }, secret, { expiresIn: cleanExpiry(expiresIn) });
  } catch {
    return jwt.sign({ userId }, secret, { expiresIn: DEFAULT_EXPIRY });
  }
};
