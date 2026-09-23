const AppError = require("../utils/AppError");
const { query } = require("../config/database");

/**
 * Middleware to restrict access based on dynamic permissions.
 * Supports Super Admin bypass.
 * @param {string} permissionName Name of permission (e.g. 'user.create')
 */
const checkPermission = (permissionName) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return next(new AppError("User context not found.", 500));
      }

      // Check if user is Super Admin
      const isSuperAdmin = user.roles.some((role) => role.name === "Super Admin");
      if (isSuperAdmin) {
        return next(); // Grant access automatically
      }

      if (user.roles.length === 0) {
        return next(new AppError("You do not have permission to perform this action.", 403));
      }

      // Extract role IDs
      const roleIds = user.roles.map((r) => r.id);

      // Query permissions associated with user's roles
      const placeholders = roleIds.map(() => "?").join(",");
      const permissions = await query(
        `SELECT DISTINCT p.name FROM permissions p 
         INNER JOIN role_permissions rp ON p.id = rp.permission_id 
         WHERE rp.role_id IN (${placeholders})`,
        roleIds
      );

      const hasRequiredPermission = permissions.some((p) => p.name === permissionName);

      if (!hasRequiredPermission) {
        return next(new AppError("You do not have permission to perform this action.", 403));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = checkPermission;
