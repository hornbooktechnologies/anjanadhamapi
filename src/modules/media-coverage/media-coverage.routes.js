const express = require("express");
const router = express.Router();
const controller = require("./media-coverage.controller");
const { createMediaCoverageSchema, updateMediaCoverageSchema } = require("./media-coverage.validation");
const validate = require("../../middlewares/validate.middleware");
const checkPermission = require("../../middlewares/permission.middleware");
const authMiddleware = require("../../middlewares/auth.middleware");

// Public GET routes
router.get("/", controller.getAll);
router.get("/:id", controller.getById);

// Protected routes
router.use(authMiddleware);

router.post("/", checkPermission("media_coverage.create"), validate(createMediaCoverageSchema), controller.create);
router.put("/:id", checkPermission("media_coverage.update"), validate(updateMediaCoverageSchema), controller.update);
router.delete("/:id", checkPermission("media_coverage.delete"), controller.remove);
router.patch("/:id/status", checkPermission("media_coverage.update"), controller.toggleStatus);

module.exports = router;
