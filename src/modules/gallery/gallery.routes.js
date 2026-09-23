const express = require("express");
const router = express.Router();
const controller = require("./gallery.controller");
const { createGallerySchema, updateGallerySchema } = require("./gallery.validation");
const validate = require("../../middlewares/validate.middleware");
const checkPermission = require("../../middlewares/permission.middleware");
const authMiddleware = require("../../middlewares/auth.middleware");

// Public GET routes
router.get("/", controller.getAll);
router.get("/:id", controller.getById);

// Protected routes
router.use(authMiddleware);

router.post("/", checkPermission("gallery.create"), validate(createGallerySchema), controller.create);
router.put("/:id", checkPermission("gallery.update"), validate(updateGallerySchema), controller.update);
router.delete("/:id", checkPermission("gallery.delete"), controller.remove);
router.patch("/:id/status", checkPermission("gallery.update"), controller.toggleStatus);
router.patch("/:id/default", checkPermission("gallery.update"), controller.setDefault);

module.exports = router;
