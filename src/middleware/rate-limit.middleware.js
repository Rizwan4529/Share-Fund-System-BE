import { ENUMS, HTTP_STATUS } from "#/utils/constants.js";
import { AppError } from "#/utils/appError.js";

/*
 * Fixed-window rate limiter kept in memory (no dependency). Counts are per
 * server instance — fine for the single Railway instance; move to a shared
 * store (e.g. Redis) if the API is ever scaled out horizontally.
 */

const SWEEP_INTERVAL_MS = 60 * 1000; // unit conversion: clean up once a minute
const limiters = new Set();

const sweep = setInterval(() => {
  const now = Date.now();
  for (const hits of limiters) {
    for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key);
  }
}, SWEEP_INTERVAL_MS);
sweep.unref(); // never keeps the process alive

/**
 * @param {object} options
 * @param {number} options.windowMs
 * @param {number} options.max  requests allowed per key per window
 * @param {(req) => string | null} options.key  null skips limiting
 * @param {string} options.message
 */
export const rateLimit = ({ windowMs, max, key, message }) => {
  const hits = new Map();
  limiters.add(hits);

  return (req, res, next) => {
    const id = key(req);
    if (!id) return next();

    const now = Date.now();
    let entry = hits.get(id);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(id, entry);
    }
    entry.count += 1;

    if (entry.count > max) {
      res.setHeader("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
      throw new AppError(message, HTTP_STATUS.TOO_MANY_REQUESTS, [
        { code: ENUMS.AUTH_ERROR_CODE.TOO_MANY_REQUESTS },
      ]);
    }
    next();
  };
};

/** Normalised email from the (not yet validated) request body. */
export const bodyEmail = (req) =>
  typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : null;
