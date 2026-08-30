import SuccessCenterProgram from "./success-center-program.model.js";

export const listSuccessCenterPrograms = async () => {
  const programs = await SuccessCenterProgram.find()
    .sort({ order: 1, name: 1 })
    .select("name status programType goalNature categoryId order");

  return {
    success: true,
    message: "Success center programs retrieved successfully",
    data: programs,
  };
};
