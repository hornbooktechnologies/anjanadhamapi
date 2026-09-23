const { successResponse } = require('../../utils/response');
const asyncHandler = require('../../utils/asyncHandler');
const service = require('./blogs.service');

exports.getAll = asyncHandler(async (req, res) => {
  const params = req.query || {};
  const data = await service.getAllBlogs(params);
  return successResponse(res, "Blogs fetched", data);
});

exports.getById = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const data = await service.getBlogById(id, req.query?.lang || "en");
  return successResponse(res, "Blog fetched", data);
});

exports.create = asyncHandler(async (req, res) => {
  const data = req.body;
  const created = await service.createBlog(data);
  return successResponse(res, "Blog created successfully", created, 201);
});

exports.update = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const data = req.body;
  const updated = await service.updateBlog(id, data);
  return successResponse(res, "Blog updated successfully", updated);
});

exports.remove = asyncHandler(async (req, res) => {
  const id = req.params.id;
  await service.deleteBlog(id);
  return successResponse(res, "Blog deleted successfully");
});

exports.toggleStatus = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const updated = await service.toggleBlogStatus(id);
  return successResponse(res, `Blog is now ${updated.status}`, updated);
});

