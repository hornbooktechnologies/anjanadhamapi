const { successResponse } = require("../../utils/response");
const asyncHandler = require("../../utils/asyncHandler");
const service = require("./media-coverage.service");

exports.getAll = asyncHandler(async (req, res) => {
  const params = req.query || {};
  const data = await service.getAllMediaCoverage({ ...params, lang: req.query?.lang || "en" });
  return successResponse(res, "Media coverage records fetched", data);
});

exports.getById = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const data = await service.getMediaCoverageById(id, req.query?.lang || "en");
  return successResponse(res, "Media coverage record fetched", data);
});

exports.create = asyncHandler(async (req, res) => {
  const data = req.body;
  const created = await service.createMediaCoverage(data);
  return successResponse(res, "Media coverage created", created, 201);
});

exports.update = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const data = req.body;
  const updated = await service.updateMediaCoverage(id, data);
  return successResponse(res, "Media coverage updated", updated);
});

exports.remove = asyncHandler(async (req, res) => {
  const id = req.params.id;
  await service.deleteMediaCoverage(id);
  return successResponse(res, "Media coverage deleted successfully");
});

exports.toggleStatus = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const updated = await service.toggleMediaCoverageStatus(id);
  return successResponse(res, `Media coverage marked as ${updated.status}`, updated);
});
