const Joi = require("joi");

const register = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(50).required(),
});

const login = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const verifyLoginOtp = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().pattern(/^\d{6}$/).required().messages({
    "string.pattern.base": "OTP must be a 6 digit code",
  }),
});

const changePassword = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).max(50).required(),
});

const forgotPassword = Joi.object({
  email: Joi.string().email().required(),
});

const resetPassword = Joi.object({
  token: Joi.string().required(),
  password: Joi.string().min(6).max(50).required(),
});

module.exports = {
  register,
  login,
  verifyLoginOtp,
  changePassword,
  forgotPassword,
  resetPassword,
};
