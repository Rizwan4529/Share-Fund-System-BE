import User from "#/features/users/user.model.js";
import { AppError } from "#/utils/appError.js";
import { ENUMS, HTTP_STATUS } from "#/utils/constants.js";
import { verifyToken } from "#/utils/jwt.js";

const CODE = ENUMS.AUTH_ERROR_CODE;

/** Suspended/closed accounts are locked out everywhere, not just at login. */
export const assertAccountUsable = (user) => {
  if (user.status === ENUMS.AUTH_STATUS.SUSPENDED)
    throw new AppError(
      "This account has been suspended. Please contact support.",
      HTTP_STATUS.FORBIDDEN,
      [{ code: CODE.ACCOUNT_SUSPENDED }],
    );
  if (user.status === ENUMS.AUTH_STATUS.CLOSED)
    throw new AppError(
      "This account has been closed. Please contact support.",
      HTTP_STATUS.FORBIDDEN,
      [{ code: CODE.ACCOUNT_CLOSED }],
    );
};

/**
 * Resolves the user for an access token: right token type, user exists, and
 * the token's version still matches (logout/suspension revoke older ones).
 */
const userFromAccessToken = async (token) => {
  const decoded = verifyToken(token, ENUMS.TOKEN_TYPE.ACCESS);
  const user = await User.findById(decoded.userId).select("+tokenVersion");
  if (!user) throw new AppError("User not found", HTTP_STATUS.UNAUTHORIZED);
  if ((decoded.tv ?? 0) !== (user.tokenVersion ?? 0))
    throw new AppError("Your session has ended. Please log in again.", HTTP_STATUS.UNAUTHORIZED, [
      { code: CODE.SESSION_EXPIRED },
    ]);
  return user;
};

export const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader)
    throw new AppError(
      "Authentication token is required",
      HTTP_STATUS.UNAUTHORIZED,
    );

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : null;

  if (!token)
    throw new AppError(
      "Invalid authentication token",
      HTTP_STATUS.UNAUTHORIZED,
    );

  const user = await userFromAccessToken(token);
  assertAccountUsable(user);
  req.user = user;
  next();
};

/** Attaches req.user when a valid Bearer token is present; never fails the request. */
export const optionalAuthenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return next();

  try {
    const token = authHeader.split(" ")[1];
    if (!token) return next();
    const user = await userFromAccessToken(token);
    assertAccountUsable(user);
    req.user = user;
  } catch {
    // ignore invalid/expired/revoked tokens for optional auth
  }
  next();
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role))
      throw new AppError(
        "You are not authorized to perform this action",
        HTTP_STATUS.FORBIDDEN,
      );

    next();
  };
};

/**
 * For participant writes (Success Profile, program selection, activation):
 * the UI already sends unverified users to /verify; this keeps the API in
 * line with it. Run after authenticate.
 */
export const requireVerifiedEmail = (req, res, next) => {
  if (!req.user?.emailVerified)
    throw new AppError(
      "Verify your email address to continue.",
      HTTP_STATUS.FORBIDDEN,
      [{ code: ENUMS.AUTH_ERROR_CODE.EMAIL_NOT_VERIFIED }],
    );
  next();
};
