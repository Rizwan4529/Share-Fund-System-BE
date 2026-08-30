import { HTTP_STATUS } from "#/utils/constants.js";
import { AppError } from "#/utils/appError.js";

const runSchema = (schema, payload) => {
  const result = schema.safeParse(payload);
  if (!result.success) {
    throw new AppError(
      "Validation failed",
      HTTP_STATUS.BAD_REQUEST,
      result.error.issues,
    );
  }
  return result.data;
};

export const validate = (schema) => {
  return (req, res, next) => {
    req.body = runSchema(schema, req.body);
    next();
  };
};

export const validateParams = (schema) => {
  return (req, res, next) => {
    const data = runSchema(schema, req.params);
    Object.assign(req.params, data);
    next();
  };
};

export const validateQuery = (schema) => {
  return (req, res, next) => {
    const data = runSchema(schema, req.query);
    Object.assign(req.query, data);
    next();
  };
};
