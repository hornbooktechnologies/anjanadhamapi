const jwt = require("jsonwebtoken");
const env = require("../config/env");

/**
 * Generate a JWT Access Token
 */
const generateAccessToken = (payload) => {
  return jwt.sign(payload, env.jwt.secret, {
    expiresIn: env.jwt.expiry,
  });
};

/**
 * Generate a JWT Refresh Token
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiry,
  });
};

/**
 * Verify Access Token
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, env.jwt.secret);
};

/**
 * Verify Refresh Token
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, env.jwt.refreshSecret);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
