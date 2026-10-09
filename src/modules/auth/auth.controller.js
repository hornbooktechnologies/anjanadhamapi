const authService = require("./auth.service");
const { generateAccessToken, generateRefreshToken } = require("../../utils/jwt");
const { successResponse } = require("../../utils/response");
const AppError = require("../../utils/AppError");
const { sendMail } = require("../../utils/mailer");
const { deliverLoginOtp } = require('../../utils/loginOtpDelivery');
const env = require("../../config/env");
const bcrypt = require("bcryptjs");

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[char];
  });

const register = async (req, res) => {
  const { name, email, password } = req.body;
  const user = await authService.createUser({ name, email, password });
  return successResponse(res, "Registration successful", user, 201);
};

const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await authService.getUserByEmail(email);

  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new AppError("Incorrect email or password", 401);
  }

  if (user.status !== "active") {
    throw new AppError("Your account is not active.", 403);
  }

  const { otp } = await authService.createLoginOtp(user.id);
  const otpRecipientEmail = env.otp.recipientEmail || user.email;
  const loginUserLabel = `${user.name || "Admin user"} (${user.email})`;
  const loginUserHtml = escapeHtml(loginUserLabel);

  await deliverLoginOtp({ otp, loginEmail: user.email, mailOptions: {
    to: otpRecipientEmail,
    subject: `Vishw Anjanadham login OTP for ${user.email}`,
    text: `${loginUserLabel} is trying to login. OTP: ${otp}. It expires in 10 minutes.`,
    html: `<p><strong>${loginUserHtml}</strong> is trying to login.</p><p>OTP: <strong>${otp}</strong></p><p>It expires in 10 minutes.</p>`,
  } });

  return successResponse(res, "OTP sent to assigned Super Admin", {
    requiresOtp: true,
    email: user.email,
    expiresInMinutes: 10,
  });
};

const verifyLoginOtp = async (req, res) => {
  const { email, otp } = req.body;
  const user = await authService.verifyLoginOtp({ email, otp });

  const accessToken = generateAccessToken({ id: user.id, email: user.email });
  const refreshToken = generateRefreshToken({ id: user.id });

  return successResponse(res, "Login successful", {
    user,
    token: accessToken,
    refreshToken,
  });
};

const logout = async (req, res) => {
  // Stateless JWT logout is normally handled on client-side.
  return successResponse(res, "Logout successful");
};

const getProfile = async (req, res) => {
  const profile = await authService.getUserById(req.user.id);
  profile.roles = req.user.roles;
  return successResponse(res, "Profile fetched successfully", profile);
};

const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await authService.getUserByEmail(req.user.email);

  if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
    throw new AppError("Current password is incorrect", 400);
  }

  await authService.updatePassword(req.user.id, newPassword);
  return successResponse(res, "Password changed successfully");
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  const { rawToken, user } = await authService.generateResetToken(email);

  // Send Email with reset link (or simulated text output)
  const resetUrl = `${req.protocol}://${req.get("host")}/api/v1/auth/reset-password?token=${rawToken}`;
  const message = `You requested a password reset. Please make a POST request to the password reset URL with your new password:\n\nURL: ${resetUrl}\nToken: ${rawToken}\n\nIf you did not request this, please ignore this email.`;

  await sendMail({
    to: user.email,
    subject: "Your Password Reset Link",
    text: message,
  });

  return successResponse(res, "Password reset email sent successfully");
};

const resetPassword = async (req, res) => {
  const { token, password } = req.body;
  await authService.resetPasswordWithToken(token, password);
  return successResponse(res, "Password reset successful");
};

module.exports = {
  register,
  login,
  verifyLoginOtp,
  logout,
  getProfile,
  changePassword,
  forgotPassword,
  resetPassword,
};
