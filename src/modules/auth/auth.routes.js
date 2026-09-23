const express = require("express");
const router = express.Router();
const authController = require("./auth.controller");
const validate = require("../../middlewares/validate.middleware");
const authMiddleware = require("../../middlewares/auth.middleware");
const authValidation = require("./auth.validation");
const asyncHandler = require("../../utils/asyncHandler");

router.post(
  "/register",
  validate(authValidation.register),
  asyncHandler(authController.register)
);

router.post(
  "/login",
  validate(authValidation.login),
  asyncHandler(authController.login)
);

router.post(
  "/verify-login-otp",
  validate(authValidation.verifyLoginOtp),
  asyncHandler(authController.verifyLoginOtp)
);

router.post(
  "/logout",
  asyncHandler(authController.logout)
);

router.get(
  "/profile",
  authMiddleware,
  asyncHandler(authController.getProfile)
);

router.post(
  "/change-password",
  authMiddleware,
  validate(authValidation.changePassword),
  asyncHandler(authController.changePassword)
);

router.post(
  "/forgot-password",
  validate(authValidation.forgotPassword),
  asyncHandler(authController.forgotPassword)
);

router.post(
  "/reset-password",
  validate(authValidation.resetPassword),
  asyncHandler(authController.resetPassword)
);

module.exports = router;
