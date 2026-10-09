const service = require("./news.service");
const { successResponse } = require("../../utils/response");

// ==========================================
// 1. CATEGORY TABS
// ==========================================

const createCategory = async (req, res) => {
  const result = await service.createCategory(req.body);
  return successResponse(res, "Category tab created successfully", result, 201);
};

const getCategories = async (req, res) => {
  const result = await service.getCategories(req.query);
  return successResponse(
    res,
    "Categories fetched successfully",
    result.data,
    200,
    result.pagination
  );
};

const getCategoryById = async (req, res) => {
  const result = await service.getCategoryById(req.params.id);
  if (!result) {
    return res.status(404).json({ success: false, message: "Category tab not found" });
  }
  return successResponse(res, "Category tab fetched successfully", result);
};

const updateCategory = async (req, res) => {
  const result = await service.updateCategory(req.params.id, req.body);
  return successResponse(res, "Category tab updated successfully", result);
};

const deleteCategory = async (req, res) => {
  await service.deleteCategory(req.params.id);
  return successResponse(res, "Category tab deleted successfully");
};

const toggleCategoryStatus = async (req, res) => {
  const result = await service.toggleCategoryStatus(req.params.id);
  return successResponse(res, `Category status updated to ${result.status}`, result);
};

// ==========================================
// 2. NEWS & UPDATES CONTENT
// ==========================================

const createNews = async (req, res) => {
  const result = await service.createNews(req.body);
  return successResponse(res, "News article created successfully", result, 201);
};

const getNewsContent = async (req, res) => {
  const result = await service.getNewsContent(req.query);
  return successResponse(
    res,
    "News content list fetched successfully",
    result.data,
    200,
    result.pagination
  );
};

const getPublicAnnouncements = async (req, res) => {
  const result = await service.getPublicAnnouncements(req.query);
  return successResponse(res, "Announcements fetched successfully", result.data, 200, result.pagination);
};

const getNewsById = async (req, res) => {
  const result = await service.getNewsById(req.params.id);
  if (!result) {
    return res.status(404).json({ success: false, message: "News article not found" });
  }
  return successResponse(res, "News article details fetched successfully", result);
};

const updateNews = async (req, res) => {
  const result = await service.updateNews(req.params.id, req.body);
  return successResponse(res, "News article updated successfully", result);
};

const deleteNews = async (req, res) => {
  await service.deleteNews(req.params.id);
  return successResponse(res, "News article deleted successfully");
};

const toggleNewsPublish = async (req, res) => {
  const result = await service.toggleNewsPublish(req.params.id);
  return successResponse(res, `News publish status updated to ${result.publish_status}`, result);
};

module.exports = {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus,
  createNews,
  getNewsContent,
  getPublicAnnouncements,
  getNewsById,
  updateNews,
  deleteNews,
  toggleNewsPublish,
};
