import { HTTP_STATUS } from "#/utils/constants.js";
import { AppError } from "#/utils/appError.js";

export const validate = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      throw new AppError(
        "Validation failed",
        HTTP_STATUS.BAD_REQUEST,
        result.error.issues,
      );
    }
    req.body = result.data;
    next();
  };
};
