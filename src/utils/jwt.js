import jwt from "jsonwebtoken";
import { AUTH_TOKEN_EXPIRY, ENUMS, HTTP_STATUS } from "./constants.js";
import { AppError } from "./appError.js";

/*
 * Every token carries a `type` so a token minted for one purpose can't be used
 * for another (an email-verification link is never a session, and a session
 * token can't verify an email). Access tokens also carry `tv` — the user's
 * tokenVersion — so logout/suspension can revoke them server-side.
 */

const TYPE = ENUMS.TOKEN_TYPE;

const cleanExpiry = (value, fallback) => {
  const cleaned = String(value || fallback)
    .trim()
    .replace(/^["']|["']$/g, "");
  return cleaned || fallback;
};

const requireSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AppError("Server is missing JWT_SECRET", HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
  return secret;
};

const sign = (payload, expiresIn, fallback) => {
  const secret = requireSecret();
  try {
    return jwt.sign(payload, secret, { expiresIn: cleanExpiry(expiresIn, fallback) });
  } catch {
    // An invalid configured expiry (e.g. a typo in .env) falls back safely.
    return jwt.sign(payload, secret, { expiresIn: fallback });
  }
};

/** Session token. `remember` selects the longer "Remember me" lifetime. */
export const signAccessToken = (user, { remember = false } = {}) => {
  const payload = { userId: user._id, type: TYPE.ACCESS, tv: user.tokenVersion ?? 0 };
  return remember
    ? sign(payload, process.env.JWT_REMEMBER_EXPIRY_DATE, AUTH_TOKEN_EXPIRY.REMEMBER_ME)
    : sign(payload, process.env.JWT_EXPIRY_DATE, AUTH_TOKEN_EXPIRY.DEFAULT);
};

/** Single-use email-verification token; `nonce` must match the user's current one. */
export const signEmailVerificationToken = (userId, nonce) =>
  sign(
    { userId, type: TYPE.EMAIL_VERIFICATION, nonce },
    AUTH_TOKEN_EXPIRY.EMAIL_VERIFICATION,
    AUTH_TOKEN_EXPIRY.EMAIL_VERIFICATION,
  );

/**
 * Verifies signature/expiry and that the token was minted for `expectedType`.
 * jsonwebtoken errors (JsonWebTokenError / TokenExpiredError) propagate.
 */
export const verifyToken = (token, expectedType) => {
  const decoded = jwt.verify(token, requireSecret());
  if (decoded?.type !== expectedType) throw new jwt.JsonWebTokenError("token type mismatch");
  return decoded;
};
