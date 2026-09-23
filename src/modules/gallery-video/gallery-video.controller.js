const { successResponse } = require("../../utils/response");
const asyncHandler = require("../../utils/asyncHandler");
const service = require("./gallery-video.service");

exports.getAll = asyncHandler(async (req, res) => {
  const params = req.query || {};
  const data = await service.getAllGalleryVideos({ ...params, lang: req.query?.lang || "en" });
  return successResponse(res, "Gallery videos fetched", data);
});

exports.getById = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const data = await service.getGalleryVideoById(id, req.query?.lang || "en");
  return successResponse(res, "Gallery video fetched", data);
});

exports.create = asyncHandler(async (req, res) => {
  const data = req.body;
  const created = await service.createGalleryVideo(data);
  return successResponse(res, "Gallery video created", created, 201);
});

exports.update = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const data = req.body;
  const updated = await service.updateGalleryVideo(id, data);
  return successResponse(res, "Gallery video updated", updated);
});

exports.remove = asyncHandler(async (req, res) => {
  const id = req.params.id;
  await service.deleteGalleryVideo(id);
  return successResponse(res, "Gallery video deleted successfully");
});

exports.toggleStatus = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const updated = await service.toggleGalleryVideoStatus(id);
  return successResponse(res, `Gallery video marked as ${updated.status}`, updated);
});
