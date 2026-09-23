const { successResponse } = require('../../utils/response');
const asyncHandler = require('../../utils/asyncHandler');
const service = require('./facilities.service');

exports.getAll = asyncHandler(async (req, res) => {
  const params = req.query || {};
  const data = await service.getAllFacilities(params);
  return successResponse(res, "Facilities fetched", data);
});

exports.getById = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const data = await service.getFacilityById(id, req.query?.lang || "en");
  return successResponse(res, "Facility fetched", data);
});

exports.create = asyncHandler(async (req, res) => {
  const data = req.body;
  const created = await service.createFacility(data);
  return successResponse(res, "Facility created successfully", created, 201);
});

exports.update = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const data = req.body;
  const updated = await service.updateFacility(id, data);
  return successResponse(res, "Facility updated successfully", updated);
});

exports.remove = asyncHandler(async (req, res) => {
  const id = req.params.id;
  await service.deleteFacility(id);
  return successResponse(res, "Facility deleted successfully");
});

exports.toggleStatus = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const updated = await service.toggleFacilityStatus(id);
  return successResponse(res, `Facility is now ${updated.status}`, updated);
});

