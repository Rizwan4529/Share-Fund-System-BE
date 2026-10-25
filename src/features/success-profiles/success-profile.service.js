import { ENUMS, HTTP_STATUS } from "#/utils/constants.js";
import { AppError } from "#/utils/appError.js";
import { writeAuditLog } from "#/features/audit-logs/audit-log.service.js";
import SuccessProfile from "./success-profile.model.js";

const NESTED_SECTIONS = ["financials", "discretionaryRule", "planningAnswers"];

const findProfileByUserId = async (userId) => {
  const profile = await SuccessProfile.findOne({ userId });
  if (!profile)
    throw new AppError(
      "Success profile not found. Create your profile first.",
      HTTP_STATUS.NOT_FOUND,
    );
  return profile;
};

/**
 * Applies only the provided fields. Nested sections are set field-by-field
 * (e.g. `financials.monthlyDebt`) because assigning the whole object would
 * wipe the fields the participant did not send.
 */
const applyProfileUpdates = (profile, data) => {
  for (const [key, value] of Object.entries(data)) {
    if (NESTED_SECTIONS.includes(key)) {
      for (const [field, fieldValue] of Object.entries(value)) {
        profile.set(`${key}.${field}`, fieldValue);
      }
    } else {
      profile.set(key, value);
    }
  }

  // Editing a submitted profile invalidates the earlier accuracy confirmation.
  if (
    profile.isModified() &&
    profile.status === ENUMS.SUCCESS_PROFILE_STATUS.COMPLETE
  ) {
    profile.status = ENUMS.SUCCESS_PROFILE_STATUS.INCOMPLETE;
    profile.accuracyConfirmed = false;
  }
};

const updateExistingProfile = async (profile, data) => {
  applyProfileUpdates(profile, data);
  await profile.save();
  return profile;
};

export const getMySuccessProfile = async (user) => {
  const profile = await SuccessProfile.findOne({ userId: user._id });
  return {
    success: true,
    message: profile
      ? "Success profile retrieved successfully"
      : "No success profile yet",
    data: profile,
  };
};

/** Creates the profile, or merges into it if this user already has one. */
export const upsertMySuccessProfile = async (data, user) => {
  const existing = await SuccessProfile.findOne({ userId: user._id });
  if (existing) {
    const profile = await updateExistingProfile(existing, data);
    return {
      created: false,
      response: {
        success: true,
        message: "Success profile updated successfully",
        data: profile,
      },
    };
  }

  try {
    const profile = new SuccessProfile({ userId: user._id });
    applyProfileUpdates(profile, data);
    await profile.save();
    return {
      created: true,
      response: {
        success: true,
        message: "Success profile created successfully",
        data: profile,
      },
    };
  } catch (err) {
    // A concurrent request created it first; fall back to updating that one.
    if (err.code !== 11000) throw err;
    const profile = await updateExistingProfile(
      await findProfileByUserId(user._id),
      data,
    );
    return {
      created: false,
      response: {
        success: true,
        message: "Success profile updated successfully",
        data: profile,
      },
    };
  }
};

export const updateMySuccessProfile = async (data, user) => {
  const profile = await updateExistingProfile(
    await findProfileByUserId(user._id),
    data,
  );
  return {
    success: true,
    message: "Success profile saved successfully",
    data: profile,
  };
};

export const completeMySuccessProfile = async (data, user) => {
  const profile = await findProfileByUserId(user._id);
  const beforeValue = profile.toObject();

  profile.accuracyConfirmed = data.accuracyConfirmed;
  profile.status = ENUMS.SUCCESS_PROFILE_STATUS.COMPLETE;
  await profile.save();

  await writeAuditLog({
    actorId: user._id,
    action: ENUMS.AUDIT_LOG_ACTION.COMPLETED_SUCCESS_PROFILE,
    targetType: ENUMS.AUDIT_LOG_TARGET_TYPE.SUCCESS_PROFILE,
    targetId: profile._id,
    beforeValue,
    afterValue: profile,
  });

  return {
    success: true,
    message: "Success profile submitted successfully",
    data: profile,
  };
};
