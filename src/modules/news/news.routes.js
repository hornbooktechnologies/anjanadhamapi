const express = require("express");
const router = express.Router();
const ctrl = require("./news.controller");
const v = require("./news.validation");
const validate = require("../../middlewares/validate.middleware");
const authMiddleware = require("../../middlewares/auth.middleware");
const checkPermission = require("../../middlewares/permission.middleware");
const asyncHandler = require("../../utils/asyncHandler");

// ==========================================
// Public Routes (No Auth Required)
// ==========================================
router.get(
  "/categories",
  asyncHandler(ctrl.getCategories)
);
router.get(
  "/categories/:id",
  asyncHandler(ctrl.getCategoryById)
);
router.get(
  "/",
  asyncHandler(ctrl.getNewsContent)
);
router.get(
  "/:id",
  asyncHandler(ctrl.getNewsById)
);

// Protect other news routes with authentication
router.use(authMiddleware);

// ==========================================
// 1. CATEGORY TABS ROUTES
// ==========================================
router.post(
  "/categories",
  checkPermission("news.category.create"),
  validate(v.saveCategory),
  asyncHandler(ctrl.createCategory)
);
router.put(
  "/categories/:id",
  checkPermission("news.category.update"),
  validate(v.saveCategory),
  asyncHandler(ctrl.updateCategory)
);
router.delete(
  "/categories/:id",
  checkPermission("news.category.delete"),
  asyncHandler(ctrl.deleteCategory)
);
router.patch(
  "/categories/:id/status",
  checkPermission("news.category.update"),
  asyncHandler(ctrl.toggleCategoryStatus)
);

// ==========================================
// 2. NEWS & UPDATES CONTENT ROUTES
// ==========================================
router.post(
  "/",
  checkPermission("news.content.create"),
  validate(v.saveNewsContent),
  asyncHandler(ctrl.createNews)
);
router.put(
  "/:id",
  checkPermission("news.content.update"),
  validate(v.saveNewsContent),
  asyncHandler(ctrl.updateNews)
);
router.delete(
  "/:id",
  checkPermission("news.content.delete"),
  asyncHandler(ctrl.deleteNews)
);
router.patch(
  "/:id/publish",
  checkPermission("news.content.publish"),
  asyncHandler(ctrl.toggleNewsPublish)
);

module.exports = router;
