const express = require("express");
const router = express.Router();
const permissionsController = require("./permissions.controller");
const validate = require("../../middlewares/validate.middleware");
const authMiddleware = require("../../middlewares/auth.middleware");
const checkPermission = require("../../middlewares/permission.middleware");
const permissionsValidation = require("./permissions.validation");
const asyncHandler = require("../../utils/asyncHandler");

router.use(authMiddleware);

router.post(
  "/",
  checkPermission("permission.manage"),
  validate(permissionsValidation.createPermission),
  asyncHandler(permissionsController.createPermission)
);

router.get(
  "/",
  checkPermission("permission.manage"),
  asyncHandler(permissionsController.getAllPermissions)
);

router.put(
  "/:id",
  checkPermission("permission.manage"),
  validate(permissionsValidation.updatePermission),
  asyncHandler(permissionsController.updatePermission)
);

router.delete(
  "/:id",
  checkPermission("permission.manage"),
  asyncHandler(permissionsController.deletePermission)
);

module.exports = router;
