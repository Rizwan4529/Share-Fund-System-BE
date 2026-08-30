import "dotenv/config";
import mongoose from "mongoose";

import { ENUMS } from "#/utils/constants.js";
import SettingCategory from "#/features/setting-categories/setting-category.model.js";

const LABELS = {
  [ENUMS.SETTING_CATEGORY.FOUNDER]: "Founder",
  [ENUMS.SETTING_CATEGORY.ACTIVATION]: "Activation",
  [ENUMS.SETTING_CATEGORY.ALLOCATION]: "Allocation",
  [ENUMS.SETTING_CATEGORY.RESERVE]: "Reserve",
  [ENUMS.SETTING_CATEGORY.PLATFORM_FEE]: "Platform fee",
  [ENUMS.SETTING_CATEGORY.THRESHOLD]: "Threshold",
  [ENUMS.SETTING_CATEGORY.DISCRETIONARY]: "Discretionary",
  [ENUMS.SETTING_CATEGORY.PRICING]: "Pricing",
  [ENUMS.SETTING_CATEGORY.AVALANCHE]: "Avalanche",
  [ENUMS.SETTING_CATEGORY.FOLLOW_ME]: "Follow me",
  [ENUMS.SETTING_CATEGORY.GROWTH_PERIOD]: "Growth period",
  [ENUMS.SETTING_CATEGORY.QUEUE]: "Queue",
  [ENUMS.SETTING_CATEGORY.STATISTICAL_PRICING]: "Statistical pricing",
};

const seed = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is required");
  }

  await mongoose.connect(process.env.MONGO_URI);

  const slugs = Object.values(ENUMS.SETTING_CATEGORY);
  let created = 0;

  for (const [index, slug] of slugs.entries()) {
    const existing = await SettingCategory.findOne({ slug });
    if (existing) continue;

    await SettingCategory.create({
      slug,
      label: LABELS[slug] ?? slug,
      order: index + 1,
    });
    created += 1;
  }

  console.log(
    `Seed complete. Setting categories +${created}/${slugs.length} (existing rows were left unchanged).`,
  );

  await mongoose.disconnect();
};

seed().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
