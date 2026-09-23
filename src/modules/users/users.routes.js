const express = require("express");
const router = express.Router();
const usersController = require("./users.controller");
const validate = require("../../middlewares/validate.middleware");
const authMiddleware = require("../../middlewares/auth.middleware");
const checkPermission = require("../../middlewares/permission.middleware");
const usersValidation = require("./users.validation");
const asyncHandler = require("../../utils/asyncHandler");

router.use(authMiddleware);

router.get(
  "/",
  checkPermission("user.read"),
  asyncHandler(usersController.getAllUsers)
);

router.get(
  "/:id",
  checkPermission("user.read"),
  asyncHandler(usersController.getUser)
);

router.post(
  "/",
  checkPermission("user.create"),
  validate(usersValidation.createUser),
  asyncHandler(usersController.createUser)
);

router.put(
  "/:id",
  checkPermission("user.update"),
  validate(usersValidation.updateUser),
  asyncHandler(usersController.updateUser)
);

router.delete(
  "/:id",
  checkPermission("user.delete"),
  asyncHandler(usersController.deleteUser)
);

router.patch(
  "/:id/status",
  checkPermission("user.update"),
  validate(usersValidation.updateStatus),
  asyncHandler(usersController.updateStatus)
);

router.post(
  "/:id/roles",
  checkPermission("role.update"),
  validate(usersValidation.assignRoles),
  asyncHandler(usersController.assignRoles)
);

module.exports = router;
