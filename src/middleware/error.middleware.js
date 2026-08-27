import { HTTP_STATUS } from "#/utils/constants.js";
import { AppError } from "#/utils/appError.js";

export const errorMiddleware = (err, req, res, next) => {
  console.error(err);

  let statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let message = err.message || "Internal Server Error";
  let errors;

  if (err.name === "AppError" || err.isOperational) {
    statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    message = err.message;
    errors = err.errors;
  } else if (err.name === "ZodError") {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = "Validation failed";
    errors = err.issues;
  } else if (err.name === "ValidationError") {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = "Validation failed";
    errors = Object.values(err.errors).map((error) => error.message);
  } else if (err.name === "JsonWebTokenError") {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    message = "Invalid token, please login again";
  } else if (err.name === "TokenExpiredError") {
    statusCode = HTTP_STATUS.UNAUTHORIZED;
    message = "Token expired, please login again";
  } else if (err.code === 11000) {
    statusCode = HTTP_STATUS.CONFLICT;
    message = `${Object.keys(err.keyValue)[0]} already exists`;
  } else if (err.name === "CastError") {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = `Invalid ${err.path}`;
  } else {
    statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
    message = "Something went wrong";
  }

  const body = { success: false, message };
  if (errors) {
    body.errors = errors;
  }

  res.status(statusCode).json(body);
};
