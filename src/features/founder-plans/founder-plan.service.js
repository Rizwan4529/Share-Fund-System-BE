import { ENUMS, HTTP_STATUS } from "#/utils/constants.js";
import { AppError } from "#/utils/appError.js";
import FounderPlan from "./founder-plan.model.js";
import SuccessCenterProgram from "#/features/success-center-programs/success-center-program.model.js";
import { writeAuditLog } from "#/features/audit-logs/audit-log.service.js";

const PROGRAM_FIELDS = "name status programType goalNature";

const populatePlans = (query) =>
  query
    .populate("includedSuccessCenters", PROGRAM_FIELDS)
    .populate("eligiblePrograms", PROGRAM_FIELDS);

const auditFounderPlan = async (user, action, plan, beforeValue, afterValue) => {
  await writeAuditLog({
    actorId: user._id,
    action,
    targetType: ENUMS.AUDIT_LOG_TARGET_TYPE.FOUNDER_PLAN,
    targetId: plan._id,
    beforeValue,
    afterValue: afterValue ?? plan,
  });
};

const assertProgramsExist = async (ids) => {
  if (!ids?.length) return;

  const uniqueIds = [...new Set(ids.map((id) => id.toString()))];
  const count = await SuccessCenterProgram.countDocuments({
    _id: { $in: uniqueIds },
  });

  if (count !== uniqueIds.length)
    throw new AppError(
      "One or more success center programs were not found",
      HTTP_STATUS.BAD_REQUEST,
    );
};

const findFounderPlanById = async (id) => {
  const plan = await populatePlans(FounderPlan.findById(id));
  if (!plan)
    throw new AppError("Founder plan not found", HTTP_STATUS.NOT_FOUND);
  return plan;
};

export const getFounderPlan = async (name) => {
  const plan = await FounderPlan.findOne({
    name,
    status: ENUMS.FOUNDER_PLAN_STATUS.ACTIVE,
  });
  if (!plan)
    throw new AppError(
      `Founder plan '${name}' not found`,
      HTTP_STATUS.NOT_FOUND,
    );
  return plan;
};

export const listFounderPlans = async (user) => {
  const filter =
    user.role === ENUMS.ROLES.ADMIN
      ? {}
      : { status: ENUMS.FOUNDER_PLAN_STATUS.ACTIVE };

  const plans = await populatePlans(FounderPlan.find(filter).sort({ price: 1 }));
  return {
    success: true,
    message: "Founder plans retrieved successfully",
    data: plans,
  };
};

export const getFounderPlanById = async (id, user) => {
  const plan = await findFounderPlanById(id);

  if (
    plan.status !== ENUMS.FOUNDER_PLAN_STATUS.ACTIVE &&
    user.role !== ENUMS.ROLES.ADMIN
  )
    throw new AppError("Founder plan not found", HTTP_STATUS.NOT_FOUND);

  return {
    success: true,
    message: "Founder plan retrieved successfully",
    data: plan,
  };
};

export const createFounderPlan = async (data, user) => {
  await assertProgramsExist([
    ...(data.includedSuccessCenters || []),
    ...(data.eligiblePrograms || []),
  ]);

  const plan = new FounderPlan(data);
  await plan.save();
  await auditFounderPlan(
    user,
    ENUMS.AUDIT_LOG_ACTION.CREATED_FOUNDER_PLAN,
    plan,
    null,
    plan,
  );

  const populated = await findFounderPlanById(plan._id);
  return {
    success: true,
    message: "Founder plan created successfully",
    data: populated,
  };
};

export const updateFounderPlan = async (id, data, user) => {
  const plan = await FounderPlan.findById(id);
  if (!plan)
    throw new AppError("Founder plan not found", HTTP_STATUS.NOT_FOUND);

  await assertProgramsExist([
    ...(data.includedSuccessCenters || []),
    ...(data.eligiblePrograms || []),
  ]);

  const beforeValue = plan.toObject();
  Object.assign(plan, data);
  await plan.save();
  await auditFounderPlan(
    user,
    ENUMS.AUDIT_LOG_ACTION.UPDATED_FOUNDER_PLAN,
    plan,
    beforeValue,
    plan,
  );

  const populated = await findFounderPlanById(plan._id);
  return {
    success: true,
    message: "Founder plan updated successfully",
    data: populated,
  };
};

export const toggleFounderPlanAvailability = async (id, data, user) => {
  const plan = await FounderPlan.findById(id);
  if (!plan)
    throw new AppError("Founder plan not found", HTTP_STATUS.NOT_FOUND);

  if (plan.status === data.status) {
    const populated = await findFounderPlanById(plan._id);
    return {
      success: true,
      message: `Founder plan is already ${data.status}`,
      data: populated,
    };
  }

  const beforeValue = { status: plan.status };
  plan.status = data.status;
  await plan.save();
  await auditFounderPlan(
    user,
    ENUMS.AUDIT_LOG_ACTION.TOGGLED_FOUNDER_PLAN_AVAILABILITY,
    plan,
    beforeValue,
    { status: plan.status },
  );

  const populated = await findFounderPlanById(plan._id);
  return {
    success: true,
    message:
      data.status === ENUMS.FOUNDER_PLAN_STATUS.ACTIVE
        ? "Founder plan activated successfully"
        : "Founder plan deactivated successfully",
    data: populated,
  };
};
