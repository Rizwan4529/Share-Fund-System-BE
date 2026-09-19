import { ENUMS, HTTP_STATUS } from "#/utils/constants.js";
import { AppError } from "#/utils/appError.js";
import { sendEmail } from "#/utils/email.js";
import { writeAuditLog } from "#/features/audit-logs/audit-log.service.js";
import {
  assertActiveCategoryExists,
  findCategoryBySlug,
} from "#/features/waitlist-campaign-categories/waitlist-campaign-category.service.js";
import WaitlistEntry from "./waitlist.model.js";

const WAITLIST_NOTIFY_EMAIL =
  process.env.WAITLIST_NOTIFY_EMAIL || "sharefundsystem@gmail.com";

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const campaignLabel = async (slug) => {
  try {
    const category = await findCategoryBySlug(slug);
    return category.label;
  } catch {
    return slug;
  }
};

const findWaitlistEntryById = async (id) => {
  const entry = await WaitlistEntry.findById(id);
  if (!entry)
    throw new AppError("Waitlist entry not found", HTTP_STATUS.NOT_FOUND);
  return entry;
};

const notifyWaitlistSignup = async (entry) => {
  const campaign = await campaignLabel(entry.campaignCategory);
  const message = entry.message?.trim() || "(No message provided)";
  const subject = `New waitlist signup: ${entry.name} · ${campaign}`;
  const text = [
    "A new pre-access waitlist signup was submitted.",
    "",
    `Name: ${entry.name}`,
    `Email: ${entry.email}`,
    `Campaign: ${campaign}`,
    `Message: ${message}`,
    `Submitted at: ${entry.createdAt?.toISOString?.() || new Date().toISOString()}`,
  ].join("\n");
  const html = `
    <h2>New waitlist signup</h2>
    <p>A new pre-access waitlist signup was submitted.</p>
    <ul>
      <li><strong>Name:</strong> ${escapeHtml(entry.name)}</li>
      <li><strong>Email:</strong> ${escapeHtml(entry.email)}</li>
      <li><strong>Campaign:</strong> ${escapeHtml(campaign)}</li>
      <li><strong>Message:</strong> ${escapeHtml(message)}</li>
      <li><strong>Submitted at:</strong> ${escapeHtml(entry.createdAt?.toISOString?.() || new Date().toISOString())}</li>
    </ul>
  `;

  await sendEmail({
    to: WAITLIST_NOTIFY_EMAIL,
    subject,
    text,
    html,
  });
};

export const listWaitlistEntries = async (query = {}) => {
  const filter = {};
  if (query.campaignCategory) filter.campaignCategory = query.campaignCategory;
  if (query.status) filter.status = query.status;
  if (query.search?.trim()) {
    const search = query.search.trim();
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { message: { $regex: search, $options: "i" } },
    ];
  }

  const entries = await WaitlistEntry.find(filter).sort({ createdAt: -1 });
  return {
    success: true,
    message: "Waitlist entries retrieved successfully",
    data: entries,
  };
};

export const getWaitlistEntryById = async (id) => {
  const entry = await findWaitlistEntryById(id);
  return {
    success: true,
    message: "Waitlist entry retrieved successfully",
    data: entry,
  };
};

export const createWaitlistEntry = async (data) => {
  await assertActiveCategoryExists(data.campaignCategory);

  const entry = new WaitlistEntry({
    name: data.name,
    email: data.email,
    campaignCategory: data.campaignCategory,
    message: data.message || "",
  });
  await entry.save();

  try {
    await notifyWaitlistSignup(entry);
  } catch (error) {
    console.error("Waitlist notification email failed:", error.message || error);
  }

  return {
    success: true,
    message: "You have been added to the waitlist",
    data: entry,
  };
};

export const updateWaitlistEntry = async (id, data, user) => {
  const entry = await findWaitlistEntryById(id);
  const beforeValue = entry.toObject();

  if (data.campaignCategory)
    await assertActiveCategoryExists(data.campaignCategory);

  Object.assign(entry, data);
  await entry.save();

  await writeAuditLog({
    actorId: user._id,
    action: ENUMS.AUDIT_LOG_ACTION.UPDATED_WAITLIST_ENTRY,
    targetType: ENUMS.AUDIT_LOG_TARGET_TYPE.WAITLIST_ENTRY,
    targetId: entry._id,
    beforeValue,
    afterValue: entry,
  });

  return {
    success: true,
    message: "Waitlist entry updated successfully",
    data: entry,
  };
};

export const deleteWaitlistEntry = async (id, user) => {
  const entry = await findWaitlistEntryById(id);
  await entry.deleteOne();

  await writeAuditLog({
    actorId: user._id,
    action: ENUMS.AUDIT_LOG_ACTION.DELETED_WAITLIST_ENTRY,
    targetType: ENUMS.AUDIT_LOG_TARGET_TYPE.WAITLIST_ENTRY,
    targetId: entry._id,
    beforeValue: entry,
  });

  return {
    success: true,
    message: "Waitlist entry deleted successfully",
    data: entry,
  };
};
