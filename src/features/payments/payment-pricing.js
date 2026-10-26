import mongoose from "mongoose";
import { ENUMS, HTTP_STATUS, SETTING_KEYS } from "#/utils/constants.js";
import { AppError } from "#/utils/appError.js";
import { toChargeableAmount } from "#/config/stripe.js";
import { getSettingsByKeys } from "#/features/settings/setting.service.js";
import FounderPlan from "#/features/founder-plans/founder-plan.model.js";
import FounderPurchase from "#/features/founder-purchases/founder-purchase.model.js";
import SuccessCenterSelection from "#/features/success-center-selections/success-center-selection.model.js";
import SuccessCenterProgram from "#/features/success-center-programs/success-center-program.model.js";
import Recommendation from "#/features/recommendations/recommendation.model.js";
import { buildEffective } from "#/features/recommendations/recommendation-effective.js";

/*
 * The ONLY place a checkout amount is decided. Every amount comes from a
 * server-side source — the pricing settings, the FounderPlan, or the stored
 * Recommendation — never from the client.
 */

const PURPOSE = ENUMS.PAYMENT_PURPOSE;
const CODE = ENUMS.PAYMENT_ERROR_CODE;

const paymentError = (message, status, code) =>
  new AppError(message, status, [{ code }]);

const unresolved = (message) =>
  paymentError(message, HTTP_STATUS.UNPROCESSABLE_ENTITY, CODE.AMOUNT_UNRESOLVED);

const alreadyPaid = (message) =>
  paymentError(message, HTTP_STATUS.CONFLICT, CODE.ALREADY_PAID);

const isPositive = (value) => typeof value === "number" && value > 0;

/** Plans are on sale unless an admin marked them `active: false`. */
const isOnSale = (plan) => plan?.active !== false;

/** Checkout currency + Funding Access plans, from the pricing settings. */
const loadPricingSettings = async () => {
  const settings = await getSettingsByKeys([
    SETTING_KEYS.PRICING_CURRENCY,
    SETTING_KEYS.PRICING_FUNDING_ACCESS_PLANS,
  ]);
  const code = settings.get(SETTING_KEYS.PRICING_CURRENCY)?.value?.code;
  const plans = settings.get(SETTING_KEYS.PRICING_FUNDING_ACCESS_PLANS)?.value;
  return {
    currency: typeof code === "string" && code.trim() ? code.trim().toUpperCase() : null,
    fundingAccessPlans: Array.isArray(plans) ? plans : [],
  };
};

const requireCurrency = (currency) => {
  if (!currency)
    throw unresolved(
      `Checkout currency is not configured (setting '${SETTING_KEYS.PRICING_CURRENCY}').`,
    );
  return currency;
};

/** Funding Access plans on sale, as configured in settings. */
export const listFundingAccessPlans = async () => {
  const { currency, fundingAccessPlans } = await loadPricingSettings();
  return fundingAccessPlans
    .filter((plan) => plan?.key && isPositive(plan.price) && isOnSale(plan))
    .map((plan) => ({
      key: plan.key,
      label: plan.label ?? plan.key,
      price: plan.price,
      programAllowance: plan.programAllowance ?? null,
      currency,
    }));
};

const resolveFundingAccess = async (referenceId, user) => {
  const { currency, fundingAccessPlans } = await loadPricingSettings();
  const plan = fundingAccessPlans.find((item) => item?.key === referenceId);
  if (!plan || !isPositive(plan.price))
    throw unresolved("That Funding Access plan doesn't exist or has no price.");
  if (!isOnSale(plan))
    throw unresolved("That Funding Access plan isn't available right now.");

  const owned = await FounderPurchase.exists({
    userId: user._id,
    purpose: PURPOSE.FUNDING_ACCESS,
    fundingAccessPlanKey: plan.key,
    activationStatus: ENUMS.FOUNDER_PURCHASE_ACTIVATION_STATUS.COMPLETED,
  });
  if (owned) throw alreadyPaid("You already have this Funding Access plan.");

  return {
    amount: plan.price,
    currency: requireCurrency(currency),
    description: `Funding Access — ${plan.label ?? plan.key}`,
  };
};

const resolveFounderTier = async (referenceId, user) => {
  if (!mongoose.isValidObjectId(referenceId))
    throw unresolved("That Founder tier doesn't exist.");
  const plan = await FounderPlan.findOne({
    _id: referenceId,
    status: ENUMS.FOUNDER_PLAN_STATUS.ACTIVE,
  }).lean();
  if (!plan || !isPositive(plan.price))
    throw unresolved("That Founder tier isn't available or has no price.");
  if (user.founderTier === plan.name)
    throw alreadyPaid("You already hold this Founder tier.");

  const { currency } = await loadPricingSettings();
  return {
    amount: plan.price,
    currency: requireCurrency(currency),
    description: `Founder Activation — ${plan.name}`,
  };
};

const resolveProgramActivation = async (referenceId, user) => {
  if (!mongoose.isValidObjectId(referenceId))
    throw unresolved("That program selection doesn't exist.");
  const selection = await SuccessCenterSelection.findOne({
    _id: referenceId,
    userId: user._id,
    status: ENUMS.SUCCESS_CENTER_SELECTION_STATUS.ACTIVE,
  }).lean();
  if (!selection) throw unresolved("That program selection doesn't exist.");
  if (selection.activationStatus === ENUMS.SELECTION_ACTIVATION_STATUS.PAID)
    throw alreadyPaid("This program's activation is already paid.");

  const [program, recommendation] = await Promise.all([
    SuccessCenterProgram.findById(selection.programId).select("name programType").lean(),
    Recommendation.findOne({ selectionId: selection._id }).lean(),
  ]);
  if (program?.programType === ENUMS.SUCCESS_CENTER_PROGRAM_TYPE.PLANNING)
    throw unresolved("Planning-only programs don't need an activation payment.");
  if (!recommendation)
    throw unresolved("Calculate your activation plan before paying.");
  // Charge what the participant sees: computed figures + any admin overrides.
  const plan = buildEffective(recommendation);

  const eligible = [
    ENUMS.RECOMMENDATION_AFFORDABILITY_STATUS.ELIGIBLE,
    ENUMS.RECOMMENDATION_AFFORDABILITY_STATUS.ELIGIBLE_WITH_ADJUSTMENT,
  ];
  if (!eligible.includes(plan.affordabilityStatus))
    throw paymentError(
      "Your activation plan isn't eligible for payment yet — see the suggestions on your plan.",
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
      CODE.NOT_ELIGIBLE,
    );

  // Full one-time activation only for now.
  // TODO(installments): charge a chosen paced option's scheduledPayment and
  // schedule the remaining installments.
  const amount = plan.oneTimeOption?.totalActivationRequirement;
  if (!isPositive(amount))
    throw unresolved("Your activation plan has no amount to pay — recalculate it first.");

  const { currency } = await loadPricingSettings();
  return {
    amount,
    currency: requireCurrency(currency),
    description: `Program activation — ${program?.name ?? "Success Center program"}`,
  };
};

const RESOLVERS = {
  [PURPOSE.FUNDING_ACCESS]: resolveFundingAccess,
  [PURPOSE.FOUNDER_TIER]: resolveFounderTier,
  [PURPOSE.PROGRAM_ACTIVATION]: resolveProgramActivation,
};

/** → { amount, currency, description } with amount rounded to what Stripe charges. */
export const resolveCheckoutItem = async (purpose, referenceId, user) => {
  const item = await RESOLVERS[purpose](referenceId, user);
  return { ...item, amount: toChargeableAmount(item.amount, item.currency) };
};

/** Re-read at fulfilment: the Funding Access plan's allowance, if still configured. */
export const findFundingAccessPlan = async (key) => {
  const { fundingAccessPlans } = await loadPricingSettings();
  return fundingAccessPlans.find((plan) => plan?.key === key) ?? null;
};
