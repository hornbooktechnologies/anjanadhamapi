const express = require("express");
const router = express.Router();
const globalContentController = require("./global-content.controller");
const globalContentValidation = require("./global-content.validation");

const validate = require("../../middlewares/validate.middleware");
const authMiddleware = require("../../middlewares/auth.middleware");
const checkPermission = require("../../middlewares/permission.middleware");
const asyncHandler = require("../../utils/asyncHandler");

// ==========================================
// Public Routes
// ==========================================
// public GET routes
router.get("/seo", asyncHandler(globalContentController.getAllSeo));
router.get("/seo/id/:id", asyncHandler(globalContentController.getSeoById));
router.get("/seo/:page", asyncHandler(globalContentController.getSeoPage));
router.get("/footer", asyncHandler(globalContentController.getFooter));
router.get("/banners", asyncHandler(globalContentController.getBanners));
router.get("/banners/:id", asyncHandler(globalContentController.getBannerById));

router.all(
  [
    "/certificates",
    "/certificates/:id",
    "/faqs",
    "/faqs/:id",
  ],
  (req, res) => {
    res.status(404).json({
      success: false,
      message: "This module has been removed.",
    });
  }
);

// ==========================================
// Protected Admin Routes (require authentication)
// ==========================================
router.use(authMiddleware);


// 1. SEO Routes
router.post(
  "/seo",
  checkPermission("global.seo.create"),
  validate(globalContentValidation.saveSeo),
  asyncHandler(globalContentController.saveSeo)
);
router.put(
  "/seo/:id",
  checkPermission("global.seo.update"),
  validate(globalContentValidation.saveSeo),
  asyncHandler(globalContentController.updateSeo)
);
router.delete(
  "/seo/:id",
  checkPermission("global.seo.delete"),
  asyncHandler(globalContentController.deleteSeoContent)
);

// 2. Footer Routes
router.put(
  "/footer",
  checkPermission("global.footer.update"),
  validate(globalContentValidation.updateFooter),
  asyncHandler(globalContentController.updateFooter)
);

// 3. Banners Routes
router.put(
  "/banners/:id",
  checkPermission("global.banner.update"),
  validate(globalContentValidation.saveBanner),
  asyncHandler(globalContentController.updateBannerDetails)
);

module.exports = router;


