const usersService = require("./users.service");
const { successResponse } = require("../../utils/response");

const assignRoles = async (req, res) => {
  const { roleIds } = req.body;
  await usersService.assignRolesToUser(req.params.id, roleIds);
  return successResponse(res, "Roles assigned to user successfully");
};

const getAllUsers = async (req, res) => {
  const { search, page, limit, sortBy, sortOrder, status } = req.query;
  const data = await usersService.getAllUsers({ search, page, limit, sortBy, sortOrder, status });
  return successResponse(res, "Users fetched successfully", data);
};

const createUser = async (req, res) => {
  const user = await usersService.createUser(req.body);
  return successResponse(res, "User created successfully", user, 201);
};

const updateUser = async (req, res) => {
  const user = await usersService.updateUser(req.params.id, req.body);
  return successResponse(res, "User updated successfully", user);
};

const deleteUser = async (req, res) => {
  await usersService.deleteUser(req.params.id);
  return successResponse(res, "User deleted successfully");
};

const updateStatus = async (req, res) => {
  const { status } = req.body;
  await usersService.updateUserStatus(req.params.id, status);
  return successResponse(res, "User status updated successfully");
};

const getUser = async (req, res) => {
  const user = await usersService.getUserById(req.params.id);
  return successResponse(res, "User fetched successfully", user);
};

module.exports = {
  assignRoles,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  updateStatus,
  getUser,
};
