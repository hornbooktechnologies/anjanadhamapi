const express = require("express");
const router = express.Router();
const ctrl = require("./homepage.controller");
const v = require("./homepage.validation");
const validate = require("../../middlewares/validate.middleware");
const authMiddleware = require("../../middlewares/auth.middleware");
const checkPermission = require("../../middlewares/permission.middleware");
const asyncHandler = require("../../utils/asyncHandler");

// Public GET routes
router.get("/stats", asyncHandler(ctrl.getStats));
router.get("/stats/:id", asyncHandler(ctrl.getStatById));
router.get("/process", asyncHandler(ctrl.getProcessSection));
router.get("/process/steps", asyncHandler(ctrl.getProcessSteps));
router.get("/process/steps/:id", asyncHandler(ctrl.getProcessStepById));
router.get("/whychoose", asyncHandler(ctrl.getWhyChooseSection));
router.get("/whychoose/cards", asyncHandler(ctrl.getWhyChooseCards));
router.get("/whychoose/cards/:id", asyncHandler(ctrl.getWhyChooseCardById));
router.get("/banners", asyncHandler(ctrl.getBanners));
router.get("/banners/:id", asyncHandler(ctrl.getBannerById));

router.use(authMiddleware);

// ── Stats ──────────────────────────────────────────────
router.post("/stats", checkPermission("homepage.stats.create"), validate(v.saveStat), asyncHandler(ctrl.createStat));
router.put("/stats/:id", checkPermission("homepage.stats.update"), validate(v.saveStat), asyncHandler(ctrl.updateStat));
router.delete("/stats/:id", checkPermission("homepage.stats.delete"), asyncHandler(ctrl.deleteStat));

// ── Process Section ────────────────────────────────────
router.put("/process/section", checkPermission("homepage.process.update"), validate(v.updateProcessSection), asyncHandler(ctrl.updateProcessSection));
router.post("/process/steps", checkPermission("homepage.process.create"), validate(v.saveProcessStep), asyncHandler(ctrl.createProcessStep));
router.put("/process/steps/:id", checkPermission("homepage.process.update"), validate(v.saveProcessStep), asyncHandler(ctrl.updateProcessStep));
router.delete("/process/steps/:id", checkPermission("homepage.process.delete"), asyncHandler(ctrl.deleteProcessStep));

// ── Why Choose Section ─────────────────────────────────
router.put("/whychoose/section", checkPermission("homepage.whychoose.update"), validate(v.updateWhyChooseSection), asyncHandler(ctrl.updateWhyChooseSection));
router.post("/whychoose/cards", checkPermission("homepage.whychoose.create"), validate(v.saveWhyChooseCard), asyncHandler(ctrl.createWhyChooseCard));
router.put("/whychoose/cards/:id", checkPermission("homepage.whychoose.update"), validate(v.saveWhyChooseCard), asyncHandler(ctrl.updateWhyChooseCard));
router.delete("/whychoose/cards/:id", checkPermission("homepage.whychoose.delete"), asyncHandler(ctrl.deleteWhyChooseCard));

// ── Banners ────────────────────────────────────────────
router.post("/banners", checkPermission("homepage.banner.create"), validate(v.saveBanner), asyncHandler(ctrl.createBanner));
router.put("/banners/:id", checkPermission("homepage.banner.update"), validate(v.saveBanner), asyncHandler(ctrl.updateBanner));
router.delete("/banners/:id", checkPermission("homepage.banner.delete"), asyncHandler(ctrl.deleteBanner));
router.patch("/banners/:id/status", checkPermission("homepage.banner.update"), asyncHandler(ctrl.toggleBannerStatus));

module.exports = router;
