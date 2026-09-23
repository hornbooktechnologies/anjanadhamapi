const teamService = require("./team.service");
const { successResponse } = require("../../utils/response");

// ==========================================
// TEAM MEMBERS CONTROLLER
// ==========================================

const createMember = async (req, res) => {
  const member = await teamService.createMember(req.body);
  return successResponse(res, "Team member created successfully", member, 201);
};

const getMembers = async (req, res) => {
  const result = await teamService.getMembers(req.query);
  return successResponse(res, "Team members fetched successfully", result.data, 200, result.pagination);
};

const getMemberById = async (req, res) => {
  const member = await teamService.getMemberById(req.params.id);
  if (!member) {
    return res.status(404).json({ success: false, message: "Team member not found" });
  }
  return successResponse(res, "Team member fetched successfully", member);
};

const updateMember = async (req, res) => {
  const member = await teamService.updateMember(req.params.id, req.body);
  return successResponse(res, "Team member updated successfully", member);
};

const deleteMember = async (req, res) => {
  await teamService.deleteMember(req.params.id);
  return successResponse(res, "Team member deleted successfully");
};

const toggleMemberStatus = async (req, res) => {
  const result = await teamService.toggleMemberStatus(req.params.id);
  return successResponse(res, `Team member marked as ${result.status}`, result);
};

// ==========================================
// LIFE AT ANJANADHAM CONTROLLER
// ==========================================

const getLifeSection = async (req, res) => {
  const section = await teamService.getLifeSection();
  return successResponse(res, "Life at Anjanadham section fetched successfully", section);
};

const updateLifeSection = async (req, res) => {
  const section = await teamService.updateLifeSection(req.body);
  return successResponse(res, "Life at Anjanadham section updated successfully", section);
};

const createLifeItem = async (req, res) => {
  const item = await teamService.createLifeItem(req.body);
  return successResponse(res, "Gallery item created successfully", item, 201);
};

const getLifeItems = async (req, res) => {
  const result = await teamService.getLifeItems(req.query);
  return successResponse(res, "Gallery items fetched successfully", result.data, 200, result.pagination);
};

const getLifeItemById = async (req, res) => {
  const item = await teamService.getLifeItemById(req.params.id);
  if (!item) {
    return res.status(404).json({ success: false, message: "Gallery item not found" });
  }
  return successResponse(res, "Gallery item fetched successfully", item);
};

const updateLifeItem = async (req, res) => {
  const item = await teamService.updateLifeItem(req.params.id, req.body);
  return successResponse(res, "Gallery item updated successfully", item);
};

const deleteLifeItem = async (req, res) => {
  await teamService.deleteLifeItem(req.params.id);
  return successResponse(res, "Gallery item deleted successfully");
};

const toggleLifeItemStatus = async (req, res) => {
  const result = await teamService.toggleLifeItemStatus(req.params.id);
  return successResponse(res, `Gallery item marked as ${result.status}`, result);
};

module.exports = {
  createMember,
  getMembers,
  getMemberById,
  updateMember,
  deleteMember,
  toggleMemberStatus,
  getLifeSection,
  updateLifeSection,
  createLifeItem,
  getLifeItems,
  getLifeItemById,
  updateLifeItem,
  deleteLifeItem,
  toggleLifeItemStatus,
};
