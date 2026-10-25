import jwt from "jsonwebtoken";
import User from "#/features/users/user.model.js";
import { AppError } from "#/utils/appError.js";
import { HTTP_STATUS } from "#/utils/constants.js";

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

  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  const user = await User.findById(decoded.userId);

  if (!user) throw new AppError("User not found", HTTP_STATUS.UNAUTHORIZED);
  // TODO(account-status): admins can now set User.status to suspended/closed
  // (PATCH /admin/participants/:userId/status) but it is not enforced yet.
  // Enforcement belongs here (reject suspended/closed non-admin users) and
  // in the login service.
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (user) req.user = user;
  } catch {
    // ignore invalid/expired tokens for optional auth
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
