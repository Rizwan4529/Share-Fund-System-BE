import "dotenv/config";
import mongoose from "mongoose";

import { ENUMS } from "#/utils/constants.js";
import SuccessCenterCategory from "#/features/success-center-categories/success-center-category.model.js";
import SuccessCenterProgram from "#/features/success-center-programs/success-center-program.model.js";
import FounderPlan from "#/features/founder-plans/founder-plan.model.js";

// The eight approved Success Center categories (brief §4), in display order.
const CATEGORIES = [
  {
    slug: "housing",
    name: "Housing",
    description:
      "Plan for rent, mortgage, deposits, home purchases, moving expenses, and other housing-related goals.",
  },
  {
    slug: "food-groceries",
    legacySlug: "food-household",
    name: "Food & Groceries",
    description:
      "Plan for household food, groceries, and recurring nutritional needs.",
  },
  {
    slug: "utilities",
    name: "Utilities",
    description:
      "Plan for electricity, water, internet, heating, cooling, and other essential household utility expenses.",
  },
  {
    slug: "debt-reduction",
    legacySlug: "debt-management",
    name: "Debt Reduction",
    description:
      "Plan personalized goals for reducing credit cards, loans, past-due balances, and other personal debt.",
  },
  {
    slug: "transportation",
    name: "Transportation",
    description: "Plan for vehicle purchase, payments, and transportation needs.",
  },
  {
    slug: "health-medical",
    name: "Health & Medical",
    description:
      "Plan for medical care, dental treatment, elective procedures, recovery expenses, and eligible health goals.",
  },
  {
    slug: "business-growth",
    name: "Business Growth",
    description:
      "Plan for business startup, expansion, equipment, inventory, commercial space, staffing, and operational needs.",
  },
  {
    slug: "education",
    name: "Education",
    description:
      "Plan for tuition, trade school, professional training, certifications, and career-development goals.",
  },
];

// Transportation has exactly these three programs (brief §4).
const PROGRAMS = [
  { slug: "housing-rent-stabilization", category: "housing", name: "Rent Stabilization" },
  { slug: "housing-deposit", category: "housing", name: "Deposit & Move-In" },
  { slug: "housing-mortgage", category: "housing", name: "Mortgage Readiness" },
  { slug: "food-groceries", category: "food-groceries", name: "Groceries" },
  { slug: "utilities-household", category: "utilities", name: "Household Utilities" },
  { slug: "debt-credit-card", category: "debt-reduction", name: "Credit Card Payoff" },
  { slug: "debt-consolidation", category: "debt-reduction", name: "Debt Consolidation Plan" },
  { slug: "transportation-vehicle", category: "transportation", name: "Vehicle Purchase" },
  { slug: "transportation-payment", category: "transportation", name: "Monthly Vehicle Payment" },
  { slug: "transportation-fuel", category: "transportation", name: "Gas Card or Fuel Account" },
  { slug: "health-procedure", category: "health-medical", name: "Planned Procedure" },
  { slug: "health-reserve", category: "health-medical", name: "Medical Reserve" },
  { slug: "business-startup", category: "business-growth", name: "Startup Launch" },
  { slug: "business-equipment", category: "business-growth", name: "Equipment & Tools" },
  { slug: "education-tuition", category: "education", name: "Education & Tuition" },
  { slug: "education-certification", category: "education", name: "Certification & Training" },
];

const FOUNDER_PLANS = [
  {
    name: ENUMS.FOUNDER_PLAN_NAME.ESSENTIAL_100,
    price: 100,
    includedSlugs: ["housing-rent-stabilization"],
    eligibleSlugs: [],
    fundingCap: { standard: 10000, premium: null },
    majorOneTimeProgramsEligible: false,
    priorityLevel: ENUMS.FOUNDER_PLAN_PRIORITY_LEVEL.STANDARD,
    bmisPlanningLevel: ENUMS.FOUNDER_PLAN_BMIS_PLANNING_LEVEL.STANDARD,
  },
  {
    name: ENUMS.FOUNDER_PLAN_NAME.EXPANDED_500,
    price: 500,
    includedSlugs: [
      "housing-rent-stabilization",
      "housing-deposit",
      "transportation-vehicle",
      "debt-credit-card",
      "food-groceries",
    ],
    eligibleSlugs: ["transportation-vehicle"],
    fundingCap: { standard: 25000, premium: 40000 },
    majorOneTimeProgramsEligible: false,
    priorityLevel: ENUMS.FOUNDER_PLAN_PRIORITY_LEVEL.HIGHER,
    bmisPlanningLevel: ENUMS.FOUNDER_PLAN_BMIS_PLANNING_LEVEL.EXPANDED,
  },
  {
    name: ENUMS.FOUNDER_PLAN_NAME.PREMIUM_1000,
    price: 1000,
    includedSlugs: PROGRAMS.map((program) => program.slug),
    eligibleSlugs: ["transportation-vehicle", "business-startup"],
    fundingCap: { standard: 50000, premium: 100000 },
    majorOneTimeProgramsEligible: true,
    priorityLevel: ENUMS.FOUNDER_PLAN_PRIORITY_LEVEL.PREMIUM,
    bmisPlanningLevel: ENUMS.FOUNDER_PLAN_BMIS_PLANNING_LEVEL.PREMIUM,
  },
];

// --sync-approved-copy: bring existing categories in line with the approved
// list (rename legacy slugs, apply approved names, descriptions and order).
// Without it, existing rows are never changed.
const syncApprovedCopy = process.argv.includes("--sync-approved-copy");

const upsertCategory = async (category, index) => {
  const existing =
    (await SuccessCenterCategory.findOne({ slug: category.slug })) ??
    (category.legacySlug &&
      (await SuccessCenterCategory.findOne({ slug: category.legacySlug })));
  if (existing) {
    if (syncApprovedCopy) {
      existing.slug = category.slug;
      existing.name = category.name;
      existing.description = category.description;
      existing.order = index + 1;
      await existing.save();
    }
    return { created: false, doc: existing };
  }

  const doc = await SuccessCenterCategory.create({
    name: category.name,
    slug: category.slug,
    description: category.description,
    order: index + 1,
    status: ENUMS.SUCCESS_CENTER_CATEGORY_STATUS.ACTIVE,
  });
  return { created: true, doc };
};

const upsertProgram = async (program, categoryId) => {
  const existing = await SuccessCenterProgram.findOne({
    name: program.name,
    categoryId,
  });
  if (existing) return { created: false, doc: existing };

  const doc = await SuccessCenterProgram.create({
    categoryId,
    name: program.name,
    description: program.name,
    status: ENUMS.SUCCESS_CENTER_PROGRAM_STATUS.PUBLISHED,
    programType: ENUMS.SUCCESS_CENTER_PROGRAM_TYPE.PLANNING,
    goalNature: ENUMS.SUCCESS_CENTER_GOAL_NATURE.ONE_TIME,
  });
  return { created: true, doc };
};

const upsertPlan = async (plan, programsBySlug) => {
  const includedSuccessCenters = plan.includedSlugs.map((slug) => {
    const program = programsBySlug.get(slug);
    if (!program) throw new Error(`Missing program for slug ${slug}`);
    return program._id;
  });
  const eligiblePrograms = plan.eligibleSlugs.map((slug) => {
    const program = programsBySlug.get(slug);
    if (!program) throw new Error(`Missing program for slug ${slug}`);
    return program._id;
  });

  const existing = await FounderPlan.findOne({ name: plan.name });
  if (existing) return { created: false, doc: existing };

  const doc = await FounderPlan.create({
    name: plan.name,
    price: plan.price,
    includedSuccessCenters,
    eligiblePrograms,
    fundingCap: plan.fundingCap,
    majorOneTimeProgramsEligible: plan.majorOneTimeProgramsEligible,
    priorityLevel: plan.priorityLevel,
    bmisPlanningLevel: plan.bmisPlanningLevel,
    founderBenefitsVersion: "v1",
    status: ENUMS.FOUNDER_PLAN_STATUS.ACTIVE,
  });
  return { created: true, doc };
};

const seed = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is required");
  }

  await mongoose.connect(process.env.MONGO_URI);

  let createdCategories = 0;
  const categoriesBySlug = new Map();
  for (const [index, category] of CATEGORIES.entries()) {
    const result = await upsertCategory(category, index);
    categoriesBySlug.set(category.slug, result.doc);
    if (result.created) createdCategories += 1;
  }

  let createdPrograms = 0;
  const programsBySlug = new Map();
  for (const program of PROGRAMS) {
    const category = categoriesBySlug.get(program.category);
    const result = await upsertProgram(program, category._id);
    programsBySlug.set(program.slug, result.doc);
    if (result.created) createdPrograms += 1;
  }

  let createdPlans = 0;
  for (const plan of FOUNDER_PLANS) {
    const result = await upsertPlan(plan, programsBySlug);
    if (result.created) createdPlans += 1;
  }

  console.log(
    `Seed complete. Categories +${createdCategories}/${CATEGORIES.length}, programs +${createdPrograms}/${PROGRAMS.length}, founder plans +${createdPlans}/${FOUNDER_PLANS.length}. ${syncApprovedCopy ? "Existing categories were updated to the approved names and descriptions." : "Existing rows were left unchanged (pass --sync-approved-copy to apply the approved category copy)."}`,
  );

  await mongoose.disconnect();
};

seed().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
