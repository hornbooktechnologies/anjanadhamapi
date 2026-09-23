const express = require("express");
const router = express.Router();
const rolesController = require("./roles.controller");
const validate = require("../../middlewares/validate.middleware");
const authMiddleware = require("../../middlewares/auth.middleware");
const checkPermission = require("../../middlewares/permission.middleware");
const rolesValidation = require("./roles.validation");
const asyncHandler = require("../../utils/asyncHandler");

router.use(authMiddleware);

router.post(
  "/",
  checkPermission("role.create"),
  validate(rolesValidation.createRole),
  asyncHandler(rolesController.createRole)
);

router.get(
  "/",
  checkPermission("role.read"),
  asyncHandler(rolesController.getAllRoles)
);

router.get(
  "/:id",
  checkPermission("role.read"),
  asyncHandler(rolesController.getRoleById)
);

router.put(
  "/:id",
  checkPermission("role.update"),
  validate(rolesValidation.updateRole),
  asyncHandler(rolesController.updateRole)
);

router.delete(
  "/:id",
  checkPermission("role.delete"),
  asyncHandler(rolesController.deleteRole)
);

router.post(
  "/:id/permissions",
  checkPermission("permission.manage"),
  validate(rolesValidation.assignPermissions),
  asyncHandler(rolesController.assignPermissions)
);

module.exports = router;
