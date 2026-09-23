const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { query, transaction } = require("../../config/database");
const AppError = require("../../utils/AppError");

/**
 * Register a new user and assign default role (or keep it role-less until assigned)
 */
async function createUser({ name, email, password }) {
  const existingUsers = await query("SELECT id FROM users WHERE email = ?", [email]);
  if (existingUsers.length > 0) {
    throw new AppError("Email already in use", 400);
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  
  return await transaction(async (connection) => {
    // 1. Insert user
    const [result] = await connection.execute(
      "INSERT INTO users (name, email, password, status) VALUES (?, ?, ?, ?)",
      [name, email, hashedPassword, "active"]
    );
    const userId = result.insertId;

    // Optional: Fetch default user role (if exists) and assign
    const [roles] = await connection.execute("SELECT id FROM roles WHERE name = ?", ["User"]);
    if (roles.length > 0) {
      await connection.execute(
        "INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)",
        [userId, roles[0].id]
      );
    }

    return { id: userId, name, email };
  });
}

/**
 * Get user by email with password for login authentication
 */
async function getUserByEmail(email) {
  const users = await query(
    `SELECT u.id, u.name, u.email, u.password, u.status, r.id AS role_id, r.name AS role 
     FROM users u 
     LEFT JOIN user_roles ur ON u.id = ur.user_id 
     LEFT JOIN roles r ON ur.role_id = r.id 
     WHERE u.email = ?`,
    [email]
  );
  return users[0] || null;
}

async function createLoginOtp(userId) {
  const otp = crypto.randomInt(100000, 1000000).toString();
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await transaction(async (connection) => {
    await connection.execute(
      "UPDATE login_otps SET verified_at = NOW() WHERE user_id = ? AND verified_at IS NULL",
      [userId]
    );
    await connection.execute(
      "INSERT INTO login_otps (user_id, otp_hash, expires_at) VALUES (?, ?, ?)",
      [userId, otpHash, expiresAt]
    );
  });

  return { otp, expiresAt };
}

async function verifyLoginOtp({ email, otp }) {
  const rows = await query(
    `SELECT lo.id, lo.otp_hash, lo.attempts, lo.expires_at,
            u.id AS user_id, u.name, u.email, u.status, r.id AS role_id, r.name AS role
     FROM login_otps lo
     INNER JOIN users u ON u.id = lo.user_id
     LEFT JOIN user_roles ur ON u.id = ur.user_id
     LEFT JOIN roles r ON ur.role_id = r.id
     WHERE u.email = ? AND lo.verified_at IS NULL
     ORDER BY lo.id DESC
     LIMIT 1`,
    [email]
  );

  if (rows.length === 0) {
    throw new AppError("OTP not found. Please request a new login OTP.", 400);
  }

  const loginOtp = rows[0];

  if (loginOtp.status !== "active") {
    throw new AppError("Your account is not active.", 403);
  }

  if (new Date(loginOtp.expires_at).getTime() < Date.now()) {
    await query("UPDATE login_otps SET verified_at = NOW() WHERE id = ?", [loginOtp.id]);
    throw new AppError("OTP has expired. Please login again.", 400);
  }

  if (Number(loginOtp.attempts) >= 5) {
    throw new AppError("Too many incorrect OTP attempts. Please login again.", 429);
  }

  const isOtpValid = await bcrypt.compare(otp, loginOtp.otp_hash);
  if (!isOtpValid) {
    await query("UPDATE login_otps SET attempts = attempts + 1 WHERE id = ?", [loginOtp.id]);
    throw new AppError("Invalid OTP. Please try again.", 401);
  }

  await query("UPDATE login_otps SET verified_at = NOW() WHERE id = ?", [loginOtp.id]);

  return {
    id: loginOtp.user_id,
    name: loginOtp.name,
    email: loginOtp.email,
    status: loginOtp.status,
    role_id: loginOtp.role_id,
    role: loginOtp.role,
  };
}

/**
 * Find user by ID without password
 */
async function getUserById(id) {
  const users = await query(
    "SELECT id, name, email, status, created_at, updated_at FROM users WHERE id = ?",
    [id]
  );
  return users[0] || null;
}

/**
 * Update user password
 */
async function updatePassword(userId, newPassword) {
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, userId]);
}

/**
 * Generate password reset token, hash it, save to db, and return raw token
 */
async function generateResetToken(email) {
  const users = await query("SELECT id FROM users WHERE email = ?", [email]);
  if (users.length === 0) {
    throw new AppError("No user found with that email address.", 404);
  }
  const user = users[0];

  // Generate secure token
  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

  // Clean old tokens and insert new one
  await query("DELETE FROM password_resets WHERE user_id = ?", [user.id]);
  await query(
    "INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)",
    [user.id, hashedToken, expiresAt]
  );

  return { rawToken, user };
}

/**
 * Verify reset token, update user password, and remove token
 */
async function resetPasswordWithToken(rawToken, newPassword) {
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
  
  const resets = await query(
    `SELECT r.id, r.user_id, r.expires_at FROM password_resets r 
     WHERE r.token = ?`,
    [hashedToken]
  );

  if (resets.length === 0) {
    throw new AppError("Token is invalid or has expired.", 400);
  }

  const reset = resets[0];
  if (new Date(reset.expires_at) < new Date()) {
    await query("DELETE FROM password_resets WHERE id = ?", [reset.id]);
    throw new AppError("Token is invalid or has expired.", 400);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await transaction(async (connection) => {
    // 1. Update user password
    await connection.execute("UPDATE users SET password = ? WHERE id = ?", [
      hashedPassword,
      reset.user_id,
    ]);

    // 2. Delete used reset token
    await connection.execute("DELETE FROM password_resets WHERE id = ?", [reset.id]);
  });
}

module.exports = {
  createUser,
  getUserByEmail,
  createLoginOtp,
  verifyLoginOtp,
  getUserById,
  updatePassword,
  generateResetToken,
  resetPasswordWithToken,
};
