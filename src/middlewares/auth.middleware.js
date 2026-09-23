const { verifyAccessToken } = require("../utils/jwt");
const AppError = require("../utils/AppError");
const { query } = require("../config/database");

module.exports = async (req, res, next) => {
  try {
    let token;
    
    // Check Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return next(new AppError("You are not logged in. Please login to get access.", 401));
    }

    // Verify token
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      return next(new AppError("Invalid token or token expired. Please login again.", 401));
    }

    // Fetch user and check status
    const users = await query(
      "SELECT id, name, email, status FROM users WHERE id = ?",
      [decoded.id]
    );

    if (users.length === 0) {
      return next(new AppError("The user belonging to this token no longer exists.", 401));
    }

    const user = users[0];

    if (user.status !== "active") {
      return next(new AppError("Your account is not active.", 403));
    }

    // Fetch roles of user
    const roles = await query(
      "SELECT r.id, r.name FROM roles r INNER JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = ?",
      [user.id]
    );

    user.roles = roles;
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
