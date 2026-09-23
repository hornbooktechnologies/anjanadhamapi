const express = require("express");
const router = express.Router();
const controller = require("./gallery-video.controller");
const { createGalleryVideoSchema, updateGalleryVideoSchema } = require("./gallery-video.validation");
const validate = require("../../middlewares/validate.middleware");
const checkPermission = require("../../middlewares/permission.middleware");
const authMiddleware = require("../../middlewares/auth.middleware");

// Public GET routes
router.get("/", controller.getAll);
router.get("/:id", controller.getById);

// Protected routes
router.use(authMiddleware);

router.post("/", checkPermission("gallery.create"), validate(createGalleryVideoSchema), controller.create);
router.put("/:id", checkPermission("gallery.update"), validate(updateGalleryVideoSchema), controller.update);
router.delete("/:id", checkPermission("gallery.delete"), controller.remove);
router.patch("/:id/status", checkPermission("gallery.update"), controller.toggleStatus);

module.exports = router;
