import mongoose from "mongoose";
import { z } from "zod";
export const OBJECT_ID = z
  .string()
  .refine(
    (value) => mongoose.Types.ObjectId.isValid(value),
    "Invalid ObjectId",
  );

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
};

export const FRONTEND_ROUTES = {
  VERIFY_EMAIL: "verify-email/",
};

/** SFS brand tokens — sourced from the frontend theme (index.css / VerifyWelcomeCard). */
export const EMAIL_BRAND = {
  NAME: "Share Fund System",
  SHORT_NAME: "SFS",
  COLORS: {
    NAVY_DARKEST: "#06122e",
    NAVY: "#0a1c40",
    NAVY_MID: "#0b2049",
    NAVY_DEEP: "#0c1f44",
    NAVY_CARD: "#123066",
    GOLD: "#d9b74a",
    GOLD_DARK: "#c4a33a",
    GOLD_DEEP: "#a88c2e",
    INK: "#1b2c52",
    INK_HEADING: "#0c1f44",
    MUTED_SOFT: "#5c6f93",
    LINE: "#e4e9f2",
    WHITE: "#ffffff",
    APP_CANVAS: "#eef2f8",
    CANVAS_EDGE: "#e4e9f2",
  },
  FONTS: {
    DISPLAY: "Schibsted Grotesk, Arial, Helvetica, sans-serif",
    BODY: "Hanken Grotesk, Arial, Helvetica, sans-serif",
  },
};

/** Relative asset paths on the frontend. Overridden by EMAIL_*_URL env vars. */
export const EMAIL_ASSET_PATHS = {
  LOGO: "https://share-fund-system-fe.vercel.app/assets/logo-light.png",
  WORLD_WHITE: "assets/world-white.png",
};

export const EMAIL_TEMPLATES = {
  PAYMENT_RECEIPT: {
    FILE: "payment-receipt",
    SUBJECT: "Your Share Fund System receipt",
    PREHEADER: "Payment confirmed — here are your receipt details.",
    TEXT: "Hi {{firstName}},\n\nWe've received your payment.\n\nPurchase: {{description}}\nAmount: {{amount}}\nDate: {{paymentDate}}\nTransaction reference: {{transactionRef}}\n\nThis payment covers your plan/activation only — it is not a guarantee of funding outcomes.\n\nThank you,\nShare Fund System",
  },
  VERIFY_EMAIL: {
    FILE: "verify-email",
    SUBJECT: "Verify your email address",
    PREHEADER: "One quick step before you dive in.",
    TEXT: "Welcome to SFS, {{firstName}}.\n\nOne quick step before you dive in.\n\nWe've sent a verification link to {{email}}. Open the link below to confirm your address:\n\n{{verifyUrl}}\n\nIf you didn't create a Share Fund System account, you can ignore this email.",
  },
};

export const ENUMS = {
  ROLES: {
    ADMIN: "admin",
    USER: "user",
  },
  AUTH_STATUS: {
    ACTIVE: "active",
    PENDING_VERIFICATION: "pending_verification",
    INACTIVE: "inactive",
    BLOCKED: "blocked",
    DELETED: "deleted",
    SUSPENDED: "suspended",
    CLOSED: "closed",
  },
  CONTACT_METHODS: {
    EMAIL: "email",
    PHONE: "phone",
    SMS: "sms",
  },
  FOUNDER_WAITLIST_STATUS: {
    NOT_ON_LIST: "not_on_list",
    ON_WAITLIST: "on_waitlist",
  },
  FOUNDER_APPLICANT_STATUS: {
    NONE: "none",
    APPLIED: "applied",
    IN_PROGRESS: "in_progress",
    COMPLETED: "completed",
    CANCELLED: "cancelled",
    ON_HOLD: "on_hold",
  },
  FOUNDER_QUALIFICATION_STATUS: {
    NOT_STARTED: "not_started",
    PENDING_VERIFICATION: "pending_verification",
    PENDING_PROFILE: "pending_profile",
    PENDING_DISCLOSURES: "pending_disclosures",
    PENDING_ACTIVATION: "pending_activation",
    QUALIFIED: "qualified",
    DISQUALIFIED: "disqualified",
    EXPIRED: "expired",
  },
  FOUNDER_TIER: {
    NONE: "none",
    ESSENTIAL_100: "essential_100",
    EXPANDED_500: "expanded_500",
    PREMIUM_1000: "premium_1000",
  },
  SUCCESS_PROFILE_TYPE: {
    INDIVIDUAL: "individual",
    HOUSEHOLD: "household",
    GROUP: "group",
    PROFESSIONAL: "professional",
    BUSINESS: "business",
    ORGANIZATIONAL: "organizational",
  },
  SUCCESS_PROFILE_STATUS: {
    INCOMPLETE: "incomplete",
    COMPLETE: "complete",
  },
  DISCRETIONARY_RULE_LABEL: {
    WEALTH_PRESERVATION_10: "wealth_preservation_10",
    CONSERVATIVE_20: "conservative_20",
    MODERATE_30: "moderate_30",
    FLEXIBLE_40: "flexible_40",
    CUSTOM: "custom",
  },
  SUCCESS_CENTER_CATEGORY_STATUS: {
    ACTIVE: "active",
    INACTIVE: "inactive",
  },
  SUCCESS_CENTER_PROGRAM_STATUS: {
    PUBLISHED: "published",
    DRAFT: "draft",
    IN_DEVELOPMENT: "in_development",
    COMING_SOON: "coming_soon",
    INACTIVE: "inactive",
  },
  SUCCESS_CENTER_PROGRAM_TYPE: {
    FUNDING: "funding",
    PLANNING: "planning",
  },
  SUCCESS_CENTER_GOAL_NATURE: {
    ONE_TIME: "one_time",
    RECURING: "recurring",
  },
  FOUNDER_PLAN_NAME: {
    ESSENTIAL_100: "essential_100",
    EXPANDED_500: "expanded_500",
    PREMIUM_1000: "premium_1000",
  },
  FOUNDER_PLAN_PRIORITY_LEVEL: {
    STANDARD: "standard",
    HIGHER: "higher",
    PREMIUM: "premium",
  },
  FOUNDER_PLAN_BMIS_PLANNING_LEVEL: {
    STANDARD: "standard",
    EXPANDED: "expanded",
    PREMIUM: "premium",
  },
  FOUNDER_PLAN_STATUS: {
    ACTIVE: "active",
    INACTIVE: "inactive",
  },
  FOUNDER_PURCHASE_ACTIVATION_STATUS: {
    PENDING: "pending",
    COMPLETED: "completed",
    FAILED: "failed",
  },
  SUCCESS_CENTER_OBLIGATION_TYPE: {
    EXISTING_OBLIGATION: "existing_obligation",
    NEW_GOAL: "new_goal",
  },
  SUCCESS_CENTER_PRICING_SOURCE: {
    ESTIMATED: "estimated",
    VERIFIED: "verified",
  },
  SUCCESS_CENTER_PAYEE_TYPE: {
    LANDLORD: "landlord",
    LENDER: "lender",
    DEALER: "dealer",
    VENDOR: "vendor",
    PROVIDER: "provider",
    SELF: "self",
    OTHER: "other",
  },
  SUCCESS_CENTER_SELECTION_STATUS: {
    ACTIVE: "active",
    REMOVED: "removed",
  },
  RECOMMENDATION_LABEL: {
    FAST: "fast",
    MODERATE: "moderate",
    LONGER: "longer",
  },
  RECOMMENDATION_AFFORDABILITY_STATUS: {
    ELIGIBLE: "eligible",
    ELIGIBLE_WITH_ADJUSTMENT: "eligible_with_adjustment",
    BUILD_SAVINGS_FIRST: "build_savings_first",
    INCREASE_INCOME_FIRST: "increase_income_first",
    NOT_CURRENTLY_ELIGIBLE: "not_currently_eligible",
  },
  // Admin oversight of a computed recommendation.
  RECOMMENDATION_REVIEW_STATUS: {
    PENDING_REVIEW: "pending_review",
    APPROVED: "approved",
    ADJUSTED: "adjusted",
  },
  RECOMMENDATION_SORT_BY: {
    DATE: "date",
    NAME: "name",
    REVIEW_STATUS: "reviewStatus",
    AFFORDABILITY: "affordability",
  },
  // Projections are estimates, never guarantees. "not_configured" = a
  // projection rule is missing from the program and settings.
  PROJECTION_STATUS: {
    PROJECTED: "projected",
    NOT_CONFIGURED: "not_configured",
  },
  // The date a projection's growth period is assumed to start from.
  PROJECTION_BASIS: {
    CALCULATION_DATE: "calculation_date",
    ACTIVATION_PAID_DATE: "activation_paid_date",
  },
  // The date the estimated funding range is counted from.
  PROJECTION_FUNDING_ANCHOR: {
    ELIGIBILITY_DATE: "eligibility_date",
    ACTIVATION_COMPLETION_DATE: "activation_completion_date",
  },
  PROGRAM_CYCLE_REACTIVATION_STATUS: {
    NOT_DUE: "not_due",
    PENDING: "pending",
    COMPLETED: "completed",
    MISSED: "missed",
  },
  PROGRAM_CYCLE_AUTOMATIC_RENEWAL_RESULT: {
    RENEWED: "renewed",
    NOT_RENEWED: "not_renewed",
    PENDING: "pending",
  },
  PROGRAM_CYCLE_CURRENT_BMIS_STATUS: {
    PROJECTED: "projected",
    DEVELOPING: "developing",
    ON_TRACK: "on_track",
    RESERVE_SUPPORT_EXPECTED: "reserve_support_expected",
    AT_RISK: "at_risk",
    APPROVED: "approved",
    RELEASED: "released",
    PAUSED: "paused",
    RESTARTED: "restarted",
  },
  ACTIVATION_PROGRESS_FULL_UPFRONT_STATUS: {
    NOT_FULL_UPFRONT: "not_full_upfront",
    FULL_UPFRONT: "full_upfront",
  },
  ACTIVATION_PROGRESS_AVALANCHE_QUALIFICATION: {
    NOT_QUALIFIED: "not_qualified",
    QUALIFIED: "qualified",
  },
  ACTIVATION_PROGRESS_ELIGIBILITY_STATUS: {
    NOT_ELIGIBLE: "not_eligible",
    PENDING: "pending",
    ELIGIBLE: "eligible",
  },
  ACTIVATION_PROGRESS_FUNDING_ESTIMATE_STATUS: {
    PROJECTED: "projected",
    ESTIMATED: "estimated",
    CONFRIMED: "confrimed",
  },
  AVALANCHE_ELIGIBILITY: {
    ELIGIBLE: "eligible",
    INELIGIBLE: "ineligible",
  },
  AVALANCHE_QUEUE_STATUS: {
    NOT_QUEUED: "not_queued",
    QUEUED: "queued",
    IN_REVIEW: "in_review",
    APPROVED: "approved",
    RELEASED: "released",
  },
  AVALANCHE_BMIS_APPROVAL_STATUS: {
    PENDING: "pending",
    APPROVED: "approved",
    REJECTED: "rejected",
  },
  AVALANCHE_SYSTEM_CAPACITY_STATUS: {
    AVAILABLE: "available",
    CONSTRAINED: "constrained",
  },
  FOLLOW_ME_ALLOCATIONS_RELATIONSHIP_STATUS: {
    ACTIVE: "active",
    INACTIVE: "inactive",
    ENDED: "ended",
  },
  FOLLOW_ME_ALLOCATIONS_ENTRY_TYPE: {
    SIMULATION: "simulation",
    LIVE: "live",
  },
  SETTING_CATEGORY: {
    FOUNDER: "founder",
    ACTIVATION: "activation",
    ALLOCATION: "allocation",
    RESERVE: "reserve",
    PLATFORM_FEE: "platformFee",
    THRESHOLD: "threshold",
    DISCRETIONARY: "discretionary",
    PRICING: "pricing",
    AVALANCHE: "avalanche",
    FOLLOW_ME: "followMe",
    GROWTH_PERIOD: "growthPeriod",
    QUEUE: "queue",
    STATISTICAL_PRICING: "statisticalPricing",
    PROJECTION: "projection",
  },
  SETTINGS_DATA_TYPE: {
    NUMBER: "number",
    PERCENTAGE: "percentage",
    OBJECT: "object",
    ARRAY: "array",
  },
  LEGAL_DOCUMENT_TYPE: {
    DISCLAIMER: "disclaimer",
    FOUNDING_DISCLOSURE: "founding_disclosure",
    TERMS: "terms",
    PRIVACY: "privacy",
    REFUND_POLICY: "refund_policy",
    CHECKOUT_ACKNOWLEDGMENT: "checkout_acknowledgment",
    SUCCESS_CENTER_NOTICE: "success_center_notice",
    PARTNER_DISCLOSURE: "partner_disclosure",
    OTHER: "other",
  },
  LEGAL_DOCUMENT_STATUS: {
    PENDING: "pending",
    PUBLISHED: "published",
    DRAFT: "draft",
  },
  LEGAL_ACCEPTANCE_CONTEXT: {
    SIGNUP: "signup",
    CHECKOUT: "checkout",
    FOUNDER_ACTIVATION: "founder_activation",
    OTHER: "other",
  },
  WAITLIST_CAMPAIGN_CATEGORY: {
    HOUSING: "housing",
    FOOD_GROCERIES: "food_groceries",
    UTILITIES: "utilities",
    DEBT_REDUCTION: "debt_reduction",
    VEHICLE: "vehicle",
    MEDICAL: "medical",
    BUSINESS_GROWTH: "business_growth",
  },
  WAITLIST_STATUS: {
    PENDING: "pending",
    CONTACTED: "contacted",
    CONVERTED: "converted",
    ARCHIVED: "archived",
  },
  AUDIT_LOG_ACTION: {
    UPDATE_SETTING: "updated_setting",
    CREATED_SETTING: "created_setting",
    ADJUSTED_RECOMMENDATION: "adjusted_recommendation",
    APPROVED_RECOMMENDATION: "approved_recommendation",
    RESET_RECOMMENDATION: "reset_recommendation",
    PROCESSED_REFUND: "processed_refund",
    DEACTIVATED_CATEGORY: "deactivated_category",
    ASSIGNED_FOUNDER_NUMBER: "assigned_founder_number",
    QUALIFIED_FOUNDER: "qualified_founder",
    CREATED_FOUNDER_PLAN: "created_founder_plan",
    UPDATED_FOUNDER_PLAN: "updated_founder_plan",
    TOGGLED_FOUNDER_PLAN_AVAILABILITY: "toggled_founder_plan_availability",
    CREATED_SETTING_CATEGORY: "created_setting_category",
    UPDATED_SETTING_CATEGORY: "updated_setting_category",
    DELETED_SETTING_CATEGORY: "deleted_setting_category",
    CREATED_SUCCESS_CENTER_CATEGORY: "created_success_center_category",
    UPDATED_SUCCESS_CENTER_CATEGORY: "updated_success_center_category",
    DELETED_SUCCESS_CENTER_CATEGORY: "deleted_success_center_category",
    CREATED_SUCCESS_CENTER_PROGRAM: "created_success_center_program",
    UPDATED_SUCCESS_CENTER_PROGRAM: "updated_success_center_program",
    DELETED_SUCCESS_CENTER_PROGRAM: "deleted_success_center_program",
    CREATED_LEGAL_DOCUMENT: "created_legal_document",
    UPDATED_LEGAL_DOCUMENT: "updated_legal_document",
    PUBLISHED_LEGAL_DOCUMENT: "published_legal_document",
    CREATED_WAITLIST_ENTRY: "created_waitlist_entry",
    UPDATED_WAITLIST_ENTRY: "updated_waitlist_entry",
    DELETED_WAITLIST_ENTRY: "deleted_waitlist_entry",
    CREATED_WAITLIST_CAMPAIGN_CATEGORY: "created_waitlist_campaign_category",
    UPDATED_WAITLIST_CAMPAIGN_CATEGORY: "updated_waitlist_campaign_category",
    DELETED_WAITLIST_CAMPAIGN_CATEGORY: "deleted_waitlist_campaign_category",
    COMPLETED_SUCCESS_PROFILE: "completed_success_profile",
    COMPLETED_PAYMENT: "completed_payment",
    UPDATED_PARTICIPANT_STATUS: "updated_participant_status",
    UPDATED_PARTICIPANT_ACCESS: "updated_participant_access",
    FAILED_PAYMENT: "failed_payment",
    EXPORTED_DATA: "exported_data",
  },
  AUDIT_LOG_TARGET_TYPE: {
    USER: "User",
    SUCCESS_PROFILE: "SuccessProfile",
    SUCCESS_CENTER_CATEGORY: "SuccessCenterCategory",
    SUCCESS_CENTER_PROGRAM: "SuccessCenterProgram",
    SUCCESS_CENTER_SELECTION: "SuccessCenterSelection",
    FOUNDER_PLAN: "FounderPlan",
    FOUNDER_PURCHASE: "FounderPurchase",
    RECOMMENDATION: "Recommendation",
    PROGRAM_CYCLE: "ProgramCycle",
    ACTIVATION_PROGRESS: "ActivationProgress",
    AVALANCHE_QUALIFICATION: "AvalancheQualification",
    BMIS_QUEUE: "BmisQueue",
    FOLLOW_ME_ALLOCATION: "FollowMeAllocation",
    SETTING: "Setting",
    SETTING_CATEGORY: "SettingCategory",
    LEGAL_DOCUMENT: "LegalDocument",
    LEGAL_ACCEPTANCE: "LegalAcceptance",
    AUDIT_LOG: "AuditLog",
    CONTENT_BLOCK: "ContentBlock",
    PAYMENT: "Payment",
    FINANCIAL_LEDGER: "FinancialLedger",
    WAITLIST_ENTRY: "WaitlistEntry",
    WAITLIST_CAMPAIGN_CATEGORY: "WaitlistCampaignCategory",
    // Not a model: exports have no single target document (no targetId).
    DATA_EXPORT: "DataExport",
  },
  // Admin CSV exports (GET /api/v1/admin/export/:dataset).
  EXPORT_DATASET: {
    PARTICIPANTS: "participants",
    ENROLLMENTS: "enrollments",
    PAYMENTS: "payments",
  },
  // Kinds of rows in the admin overview's recent activity list.
  ADMIN_ACTIVITY_TYPE: {
    SIGNUP: "signup",
    SELECTION: "selection",
    PAYMENT: "payment",
  },
  CONTENT_BLOCK_TYPE: {
    RICH_TEXT: "richtext",
    VIDEO: "video",
  },
  NOTIFICATION_TYPE: {
    RECOMENDATION_READY: "recommendation_ready",
    PAYMENT_RECIEVED: "payment_received",
    PROFILE_REMINDER: "profile_reminder",
    FOUNDER_STATUS: "founder_status",
    ANNOUNCEMENT: "announcement",
  },
  BMIS_QUEUE_TYPE: {
    RECURRING_MONTHLY: "recurring_monthly",
    ONE_TIME: "one_time",
    AVALANCHE: "avalanche",
    RESERVE_SUPPORTED: "reserve_supported",
    PRIORITY_FUNDING: "priority_funding",
    ADMIN_REVIEW: "admin_review",
  },
  BMIS_QUEUE_GROWTH_PERIOD_STATUS: {
    NOT_STARTED: "not_started",
    IN_PROGRESS: "in_progress",
    COMPLETED: "completed",
  },
  BMIS_QUEUE_FUNDING_STATUS: {
    PROJECTED: "projected",
    PENDING: "pending",
    APPROVED: "approved",
    RELEASED: "released",
    PAUSED: "paused",
  },
  BMIS_QUEUE_RESERVE_SUPPORT_STATUS: {
    NONE: "none",
    EXPECTED: "expected",
    APPLIED: "applied",
  },
  BMIS_QUEUE_CAP_STATUS: {
    WITHIN_CAP: "within_cap",
    AT_CAP: "at_cap",
    OVER_CAP: "over_cap",
  },
  BMIS_QUEUE_DECISION: {
    PENDING: "pending",
    APPROVED: "approved",
    DEFERRED: "deferred",
    REJECTED: "rejected",
  },
  PAYMENT_PROVIDER: {
    STRIPE: "stripe",
  },
  PAYMENT_PURPOSE: {
    FUNDING_ACCESS: "funding_access",
    FOUNDER_TIER: "founder_tier",
    PROGRAM_ACTIVATION: "program_activation",
  },
  // Machine-readable reasons checkout can't start (sent in `errors`).
  PAYMENT_ERROR_CODE: {
    EMAIL_NOT_VERIFIED: "EMAIL_NOT_VERIFIED",
    ACKNOWLEDGMENT_REQUIRED: "ACKNOWLEDGMENT_REQUIRED",
    ACKNOWLEDGMENT_OUTDATED: "ACKNOWLEDGMENT_OUTDATED",
    AMOUNT_UNRESOLVED: "AMOUNT_UNRESOLVED",
    ALREADY_PAID: "ALREADY_PAID",
    NOT_ELIGIBLE: "NOT_ELIGIBLE",
  },
  PLANNING_ACCESS_STATUS: {
    INACTIVE: "inactive",
    ACTIVE: "active",
  },
  SELECTION_ACTIVATION_STATUS: {
    UNPAID: "unpaid",
    PAID: "paid",
  },
  PAYMENT_STATUS: {
    PENDING: "pending",
    COMPLETED: "completed",
    FAILED: "failed",
  },
  PAYMENT_REFUND_STATUS: {
    NONE: "none",
    REQUESTED: "requested",
    APPROVED: "approved",
    COMPLETED: "completed",
  },
  PAYMENT_DISPUTE_STATUS: {
    NONE: "none",
    PAYMENT_DISPUTE: "payment_dispute",
    CHARGEBACK: "chargeback",
  },
  FINANCIAL_LEDGER_TRANSACTION_TYPE: {
    GROSS_ACTIVATION_REVENUE: "gross_activation_revenue",
    PRIMARY_FUNDING_ALLOCATION: "primary_funding_allocation",
    PROTECTED_RESERVE: "protected_reserve",
    SPILLOVER: "spillover",
    RESERVE_PARTICIPATION: "reserve_participation",
    PLATFORM_FEE: "platform_fee",
    REWARDS: "rewards",
    FOLLOWME_DIRECTED: "followme_directed",
    FOLLOWME_WIDER: "followme_wider",
    MONTHLY_PROGRAM_SUPPORT: "monthly_program_support",
    ONETIME_PROGRAM_SUPPORT: "onetime_program_support",
    AVALANCHE_SUPPORT: "avalanche_support",
    PARTICIPANT_OBLIGATION: "participant_obligation",
    FOUNDER_BENEFIT_OBLIGATION: "founder_benefit_obligation",
    REFUND: "refund",
    REFUND_REVERSAL: "refund_reversal",
    CHARGEBACK_REVERSAL: "chargeback_reversal",
    VENDOR_RELEASE: "vendor_release",
    CURRENCY_CONVERSION: "currency_conversion",
    ADMIN_ADJUSTMENT: "admin_adjustment",
  },
  FINANCIAL_LEDGER_APPROVAL_STATUS: {
    PENDING: "pending",
    APPROVED: "approved",
    REJECTED: "rejected",
  },
  FINANCIAL_LEDGER_ENTRY_TYPE: {
    SIMULATION: "simulation",
    LIVE: "live",
  },
  // Admin participants list: standing is derived from foundingParticipant +
  // founderTier on the User (a set tier wins over the plain flag).
  PARTICIPANT_STANDING: {
    NONE: "none",
    FOUNDING_PARTICIPANT: "founding_participant",
    ESSENTIAL_100: "essential_100",
    EXPANDED_500: "expanded_500",
    PREMIUM_1000: "premium_1000",
  },
  PARTICIPANT_QUESTIONNAIRE_FILTER: {
    COMPLETE: "complete",
    INCOMPLETE: "incomplete",
  },
  PARTICIPANT_SORT_BY: {
    NAME: "name",
    EMAIL: "email",
    STATUS: "status",
    QUESTIONNAIRE: "questionnaire",
    CREATED_AT: "createdAt",
    LAST_ACTIVE_AT: "lastActiveAt",
  },
  SORT_ORDER: {
    ASC: "asc",
    DESC: "desc",
  },
  // Account states an admin can set on a participant (User.status).
  ADMIN_SETTABLE_ACCOUNT_STATUS: {
    ACTIVE: "active",
    SUSPENDED: "suspended",
    CLOSED: "closed",
  },
  // Unified admin "enrollment" rows (purchases + program activations).
  ENROLLMENT_STATUS: {
    ACTIVE: "active",
    PENDING: "pending",
    FAILED: "failed",
    REMOVED: "removed",
  },
  ENROLLMENT_SORT_BY: {
    DATE: "date",
    NAME: "name",
    EMAIL: "email",
    TYPE: "type",
    STATUS: "status",
  },
  ADMIN_PAYMENT_SORT_BY: {
    DATE: "date",
    AMOUNT: "amount",
    STATUS: "status",
    NAME: "name",
  },
  // Machine-readable reasons a plan can't be calculated (sent in `errors`).
  ACTIVATION_ERROR_CODE: {
    SELECTION_REMOVED: "SELECTION_REMOVED",
    PROFILE_REQUIRED: "PROFILE_REQUIRED",
    INCOME_REQUIRED: "INCOME_REQUIRED",
    GOAL_AMOUNT_REQUIRED: "GOAL_AMOUNT_REQUIRED",
  },
};

export const PARTICIPANT_STANDING_LABELS = {
  [ENUMS.PARTICIPANT_STANDING.NONE]: "Not active",
  [ENUMS.PARTICIPANT_STANDING.FOUNDING_PARTICIPANT]: "Founding Participant",
  [ENUMS.PARTICIPANT_STANDING.ESSENTIAL_100]: "Founder · Essential",
  [ENUMS.PARTICIPANT_STANDING.EXPANDED_500]: "Founder · Expanded",
  [ENUMS.PARTICIPANT_STANDING.PREMIUM_1000]: "Founder · Premium",
};

// TODO: no stored source for the allowance of participants without a founder
// plan yet; move this into the settings engine once Todd confirms the number.
export const DEFAULT_SUCCESS_CENTER_LIMIT = 1;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

// How many recent payments the participant dashboard lists (display only).
export const DASHBOARD_RECENT_PAYMENTS_LIMIT = 5;

// Admin overview (display only): signup windows in days, recent activity size.
export const ADMIN_OVERVIEW_SIGNUP_WINDOWS_DAYS = [7, 30];
export const ADMIN_OVERVIEW_ACTIVITY_LIMIT = 10;

/**
 * Settings-collection keys the activation calculation reads. Only the KEYS
 * live in code — values live in the settings collection (seed:
 * scripts/seed-activation-settings.js) and are admin-editable. A program's own
 * activationRules always win over these global fallbacks.
 */
export const SETTING_KEYS = {
  ACTIVATION_DEFAULT_PERCENTAGE: "activation.defaultPercentage",
  ACTIVATION_PERCENTAGE_MIN: "activation.percentageMin", // optional bound
  ACTIVATION_PERCENTAGE_MAX: "activation.percentageMax", // optional bound
  ACTIVATION_ROUNDING_INCREMENT: "activation.roundingIncrement",
  ACTIVATION_PLAN_MONTH_OPTIONS: "activation.planMonthOptions", // number[]
  ACTIVATION_MIN_GOAL_AMOUNT: "activation.minGoalAmount", // optional bound
  ACTIVATION_MAX_GOAL_AMOUNT: "activation.maxGoalAmount", // optional bound
  // Projection rules (optional: without them the plan is still calculated,
  // but its projection is marked "not_configured").
  GROWTH_PERIOD_DEFAULT_DAYS: "growthPeriod.defaultDays", // e.g. 45
  // Days after the growth period ends until eligibility (1 → "Day 46").
  GROWTH_PERIOD_ELIGIBILITY_OFFSET_DAYS: "growthPeriod.eligibilityOffsetDays",
  // Days after the funding anchor date that the earliest support is estimated.
  PROJECTION_FUNDING_START_OFFSET_DAYS: "projection.fundingStartOffsetDays",
  // Width of the estimated funding range, earliest → latest, in days.
  PROJECTION_FUNDING_RANGE_DAYS: "projection.fundingRangeDays",
  // [{ key, label, price, programAllowance }] — the Funding Access plans.
  PRICING_FUNDING_ACCESS_PLANS: "pricing.fundingAccessPlans",
  // { code: "USD" } — checkout currency (settings values can't be strings).
  PRICING_CURRENCY: "pricing.currency",
};

/** Key for the one-time option in admin adjustments (paced plans use RECOMMENDATION_LABEL). */
export const RECOMMENDATION_ONE_TIME_KEY = "one_time";

/** Stored on every recommendation projection so any reader shows it as an estimate. */
export const PROJECTION_NOTICE =
  "Projected estimate for planning only. Not a guarantee of funding, amounts, or timing.";

/** Program statuses participants may browse (draft/in_development/inactive stay hidden). */
export const PARTICIPANT_VISIBLE_PROGRAM_STATUSES = [
  ENUMS.SUCCESS_CENTER_PROGRAM_STATUS.PUBLISHED,
  ENUMS.SUCCESS_CENTER_PROGRAM_STATUS.COMING_SOON,
];

/** Program statuses a participant may activate (select). */
export const SELECTABLE_PROGRAM_STATUSES = [
  ENUMS.SUCCESS_CENTER_PROGRAM_STATUS.PUBLISHED,
];
