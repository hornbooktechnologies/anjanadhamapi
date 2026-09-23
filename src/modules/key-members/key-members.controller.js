const { successResponse } = require('../../utils/response');
const asyncHandler = require('../../utils/asyncHandler');
const service = require('./key-members.service');

exports.getAll = asyncHandler(async (req, res) => {
  const params = req.query || {};
  const data = await service.getAllKeyMembers({ ...params, lang: req.query?.lang || "en" });
  return successResponse(res, "Key members fetched", data);
});

exports.getById = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const data = await service.getKeyMemberById(id, req.query?.lang || "en");
  return successResponse(res, "Key member fetched", data);
});

exports.create = asyncHandler(async (req, res) => {
  const data = req.body;
  const created = await service.createKeyMember(data);
  return successResponse(res, "Key member created successfully", created, 201);
});

exports.update = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const data = req.body;
  const updated = await service.updateKeyMember(id, data);
  return successResponse(res, "Key member updated successfully", updated);
});

exports.remove = asyncHandler(async (req, res) => {
  const id = req.params.id;
  await service.deleteKeyMember(id);
  return successResponse(res, "Key member deleted successfully");
});

exports.toggleStatus = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const updated = await service.toggleKeyMemberStatus(id);
  return successResponse(res, `Key member is now ${updated.status}`, updated);
});
