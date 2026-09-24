const { successResponse } = require("../../utils/response");
const asyncHandler = require("../../utils/asyncHandler");
const service = require("./documents.service");

exports.getAll = asyncHandler(async (req, res) => {
  const params = req.query || {};
  const data = await service.getAllDocuments(params);
  return successResponse(res, "Documents fetched successfully", data);
});

exports.getById = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const data = await service.getDocumentById(id);
  return successResponse(res, "Document fetched successfully", data);
});

exports.create = asyncHandler(async (req, res) => {
  const file = req.file;
  const body = req.body || {};
  const userId = req.user ? req.user.id : null;

  const created = await service.createDocument(file, body, userId);
  return successResponse(res, "Document uploaded successfully", created, 201);
});

exports.update = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const data = req.body;
  const updated = await service.updateDocument(id, data);
  return successResponse(res, "Document updated successfully", updated);
});

exports.remove = asyncHandler(async (req, res) => {
  const id = req.params.id;
  await service.deleteDocument(id);
  return successResponse(res, "Document deleted successfully");
});
