const express = require("express");
const router = express.Router();
const ctrl = require("./news.controller");
const v = require("./news.validation");
const validate = require("../../middlewares/validate.middleware");
const authMiddleware = require("../../middlewares/auth.middleware");
const checkPermission = require("../../middlewares/permission.middleware");
const asyncHandler = require("../../utils/asyncHandler");
const service = require("./news.service");
const { resolvePublicationSchedule } = require("./news.schedule");

// ==========================================
// Published announcements are the only anonymous news feed.
// ==========================================
router.get("/public", asyncHandler(ctrl.getPublicAnnouncements));

router.use(authMiddleware);

router.get(
  "/categories",
  checkPermission("news.category.view"),
  asyncHandler(ctrl.getCategories)
);
router.get(
  "/categories/:id",
  checkPermission("news.category.view"),
  asyncHandler(ctrl.getCategoryById)
);
router.get(
  "/",
  checkPermission("news.content.view"),
  asyncHandler(ctrl.getNewsContent)
);
router.get(
  "/:id",
  checkPermission("news.content.view"),
  asyncHandler(ctrl.getNewsById)
);

const requirePublishPermission = asyncHandler(async (req, res, next) => {
  const existing = req.method === "PUT" ? await service.getNewsById(req.params.id) : null;
  const changesPublication = existing
    ? req.body.publish_status !== existing.publish_status
    : req.body.publish_status === "published";
  const nextSchedule = existing && resolvePublicationSchedule(req.body, existing);
  const changesSchedule = existing?.publish_status === "published" &&
    nextSchedule.publish_at !== existing.publish_at?.slice(0, 19).replace("T", " ");
  if (changesPublication || changesSchedule) {
    return checkPermission("news.content.publish")(req, res, next);
  }
  next();
});

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
  requirePublishPermission,
  asyncHandler(ctrl.createNews)
);
router.put(
  "/:id",
  checkPermission("news.content.update"),
  validate(v.saveNewsContent),
  requirePublishPermission,
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
