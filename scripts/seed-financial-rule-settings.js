import "dotenv/config";
import mongoose from "mongoose";

import { ENUMS, SETTING_KEYS } from "#/utils/constants.js";
import Setting from "#/features/settings/setting.model.js";

/*
 * Financial rules from the project brief (Doc B §10), stored as settings so
 * they are admin-configurable, versioned and audited from day one.
 *
 * Phase 1 builds these as configuration for testing and simulation only; no
 * calculation reads them yet (the activation calculation uses
 * activation.defaultPercentage and the program's own rules). The values are
 * the brief's initial setup values, not final numbers — change them through
 * the admin Settings page, which records version history.
 *
 * Only missing keys are inserted; existing settings are never overwritten.
 */
const PHASE_1_NOTE = "Configuration only in Phase 1: not used in calculations yet.";

const SETTINGS = [
  {
    key: SETTING_KEYS.PLATFORM_FEE_PERCENTAGE,
    category: ENUMS.SETTING_CATEGORY.PLATFORM_FEE,
    dataType: ENUMS.SETTINGS_DATA_TYPE.PERCENTAGE,
    value: 10,
    description: `Platform fee percentage. ${PHASE_1_NOTE}`,
  },
  {
    key: SETTING_KEYS.THRESHOLD_BASELINE_PERCENTAGE,
    category: ENUMS.SETTING_CATEGORY.THRESHOLD,
    dataType: ENUMS.SETTINGS_DATA_TYPE.PERCENTAGE,
    value: 85,
    description: `Baseline threshold for capacity monitoring (pricing/timeline review). ${PHASE_1_NOTE}`,
  },
  {
    key: SETTING_KEYS.RESERVE_PARTICIPATION_MIN,
    category: ENUMS.SETTING_CATEGORY.RESERVE,
    dataType: ENUMS.SETTINGS_DATA_TYPE.PERCENTAGE,
    value: 3,
    description: `Lowest share of reserve inflows the company may take (Head Admin set). ${PHASE_1_NOTE}`,
  },
  {
    key: SETTING_KEYS.RESERVE_PARTICIPATION_MAX,
    category: ENUMS.SETTING_CATEGORY.RESERVE,
    dataType: ENUMS.SETTINGS_DATA_TYPE.PERCENTAGE,
    value: 10,
    description: `Highest share of reserve inflows the company may take (Head Admin set). ${PHASE_1_NOTE}`,
  },
  {
    key: SETTING_KEYS.ACTIVATION_RECURRING_PERCENTAGE_RANGE,
    category: ENUMS.SETTING_CATEGORY.ACTIVATION,
    dataType: ENUMS.SETTINGS_DATA_TYPE.OBJECT,
    value: { min: 10, max: 25 },
    description: `Activation range for monthly/recurring programs, % of the approved goal. ${PHASE_1_NOTE}`,
  },
  {
    key: SETTING_KEYS.ACTIVATION_ONE_TIME_PERCENTAGE_RANGE,
    category: ENUMS.SETTING_CATEGORY.ACTIVATION,
    dataType: ENUMS.SETTINGS_DATA_TYPE.OBJECT,
    value: { min: 5, max: 60 },
    description: `Activation range for one-time programs, % of the approved goal. ${PHASE_1_NOTE}`,
  },
];

const seed = async () => {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required");
  await mongoose.connect(process.env.MONGO_URI);

  let created = 0;
  for (const setting of SETTINGS) {
    const exists = await Setting.exists({ key: setting.key });
    if (exists) {
      console.log(`skip   ${setting.key} (already set)`);
      continue;
    }
    await Setting.create({ ...setting, effectiveDate: new Date() });
    created += 1;
    console.log(`create ${setting.key} = ${JSON.stringify(setting.value)}`);
  }

  console.log(`Done — ${created} financial rule setting(s) created.`);
  await mongoose.disconnect();
};

seed().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
