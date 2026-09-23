const permissionsService = require("./permissions.service");
const { successResponse } = require("../../utils/response");

const createPermission = async (req, res) => {
  const perm = await permissionsService.createPermission(req.body);
  return successResponse(res, "Permission created successfully", perm, 201);
};

const getAllPermissions = async (req, res) => {
  const perms = await permissionsService.getAllPermissions();
  return successResponse(res, "Permissions fetched successfully", perms);
};

const updatePermission = async (req, res) => {
  const perm = await permissionsService.updatePermission(req.params.id, req.body);
  return successResponse(res, "Permission updated successfully", perm);
};

const deletePermission = async (req, res) => {
  await permissionsService.deletePermission(req.params.id);
  return successResponse(res, "Permission deleted successfully");
};

module.exports = {
  createPermission,
  getAllPermissions,
  updatePermission,
  deletePermission,
};
