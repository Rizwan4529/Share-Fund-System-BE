import "dotenv/config";
import mongoose from "mongoose";

import connectDB from "#/config/db.js";
import { ENUMS } from "#/utils/constants.js";
import User from "#/features/users/user.model.js";
import { registerSchema } from "#/features/users/user.validator.js";

/*
 * Creates an administrator from the command line. This is the only way to
 * create the FIRST admin — POST /register-admin/ requires an existing admin.
 *
 *   npm run create-admin -- --email=a@b.com --password='Str0ng!Pass' \
 *     --first=Todd --last=Kit --phone=+14155550100 --country="United States"
 *
 * The account is created verified and active (an operator created it on the
 * server). Uses the same database settings as the app (MONGO_URI/MONGO_DB_NAME).
 */

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .map((arg) => arg.match(/^--([^=]+)=(.*)$/))
    .filter(Boolean)
    .map(([, key, value]) => [key, value]),
);

const run = async () => {
  const parsed = registerSchema.safeParse({
    firstName: args.first,
    lastName: args.last,
    email: args.email,
    password: args.password,
    phone: args.phone,
    country: args.country,
  });
  if (!parsed.success) {
    console.error("Invalid admin details:");
    for (const issue of parsed.error.issues)
      console.error(` - ${issue.path.join(".")}: ${issue.message}`);
    process.exitCode = 1;
    return;
  }

  await connectDB();
  const data = parsed.data;
  if (await User.exists({ $or: [{ email: data.email }, { phone: data.phone }] })) {
    console.error("A user with that email or phone already exists — nothing created.");
    process.exitCode = 1;
    return;
  }

  const admin = await User.create({
    ...data,
    role: ENUMS.ROLES.ADMIN,
    emailVerified: true,
    status: ENUMS.AUTH_STATUS.ACTIVE,
  });
  console.log(`Admin created: ${admin.email} (${admin._id})`);
};

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
