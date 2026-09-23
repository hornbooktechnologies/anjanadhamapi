const rolesService = require("./roles.service");
const { successResponse } = require("../../utils/response");

const createRole = async (req, res) => {
  const role = await rolesService.createRole(req.body);
  return successResponse(res, "Role created successfully", role, 201);
};

const getAllRoles = async (req, res) => {
  const roles = await rolesService.getAllRoles();
  return successResponse(res, "Roles fetched successfully", roles);
};

const updateRole = async (req, res) => {
  const role = await rolesService.updateRole(req.params.id, req.body);
  return successResponse(res, "Role updated successfully", role);
};

const deleteRole = async (req, res) => {
  await rolesService.deleteRole(req.params.id);
  return successResponse(res, "Role deleted successfully");
};

const getRoleById = async (req, res) => {
  const role = await rolesService.getRoleById(req.params.id);
  return successResponse(res, "Role fetched successfully", role);
};

const assignPermissions = async (req, res) => {
  const { permissionIds } = req.body;
  await rolesService.assignPermissionsToRole(req.params.id, permissionIds);
  return successResponse(res, "Permissions assigned to role successfully");
};

module.exports = {
  createRole,
  getAllRoles,
  updateRole,
  deleteRole,
  getRoleById,
  assignPermissions,
};
