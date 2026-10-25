import Stripe from "stripe";
import { AppError } from "#/utils/appError.js";
import { HTTP_STATUS } from "#/utils/constants.js";

/*
 * Stripe client + config. Keys come only from the environment:
 *   STRIPE_SECRET_KEY      sk_test_… (Dashboard → Developers → API keys, Test mode)
 *   STRIPE_WEBHOOK_SECRET  whsec_…   (Dashboard webhook endpoint, or `stripe listen`)
 * Live keys (sk_live_…) are refused unless STRIPE_ALLOW_LIVE=true is set, so
 * production can't be switched to live by accident.
 */

let client = null;

const notConfigured = (what) =>
  new AppError(
    `Payments are not configured (${what} is missing)`,
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
  );

export const getStripe = () => {
  if (client) return client;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw notConfigured("STRIPE_SECRET_KEY");
  if (secretKey.startsWith("sk_live_") && process.env.STRIPE_ALLOW_LIVE !== "true")
    throw new AppError(
      "Live Stripe keys are disabled. Set STRIPE_ALLOW_LIVE=true to enable live payments.",
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
    );
  client = new Stripe(secretKey);
  return client;
};

export const getWebhookSecret = () => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw notConfigured("STRIPE_WEBHOOK_SECRET");
  return secret;
};

/** Digits after the decimal point for a currency (USD 2, JPY 0) — from Intl. */
const minorUnitDigits = (currency) =>
  new Intl.NumberFormat("en", { style: "currency", currency })
    .resolvedOptions().maximumFractionDigits;

/** 12.5 USD → 1250 (Stripe amounts are in the currency's smallest unit). */
export const toMinorUnits = (amount, currency) =>
  Math.round(amount * 10 ** minorUnitDigits(currency));

/** Normalises an amount to what will actually be charged (e.g. 2 decimals). */
export const toChargeableAmount = (amount, currency) =>
  toMinorUnits(amount, currency) / 10 ** minorUnitDigits(currency);
