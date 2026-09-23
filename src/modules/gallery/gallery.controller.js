const { successResponse } = require("../../utils/response");
const asyncHandler = require("../../utils/asyncHandler");
const service = require("./gallery.service");

exports.getAll = asyncHandler(async (req, res) => {
  const params = req.query || {};
  const data = await service.getAllGalleries({ ...params, lang: req.query?.lang || "en" });
  return successResponse(res, "Galleries fetched", data);
});

exports.getById = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const data = await service.getGalleryById(id, req.query?.lang || "en");
  return successResponse(res, "Gallery fetched", data);
});

exports.create = asyncHandler(async (req, res) => {
  const data = req.body;
  const created = await service.createGallery(data);
  return successResponse(res, "Gallery created", created, 201);
});

exports.update = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const data = req.body;
  const updated = await service.updateGallery(id, data);
  return successResponse(res, "Gallery updated", updated);
});

exports.remove = asyncHandler(async (req, res) => {
  const id = req.params.id;
  await service.deleteGallery(id);
  return successResponse(res, "Gallery deleted successfully");
});

exports.toggleStatus = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const updated = await service.toggleGalleryStatus(id);
  return successResponse(res, `Gallery marked as ${updated.status}`, updated);
});

exports.setDefault = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const updated = await service.setDefaultGallery(id);
  return successResponse(res, "Gallery set as default", updated);
});
