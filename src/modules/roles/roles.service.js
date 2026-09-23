const { query, transaction } = require("../../config/database");
const AppError = require("../../utils/AppError");

async function createRole({ name, description }) {
  const existing = await query("SELECT id FROM roles WHERE name = ?", [name]);
  if (existing.length > 0) {
    throw new AppError("Role name already exists", 400);
  }

  const result = await query("INSERT INTO roles (name, description) VALUES (?, ?)", [
    name,
    description,
  ]);
  return { id: result.insertId, name, description };
}

async function getAllRoles() {
  const roles = await query("SELECT * FROM roles ORDER BY id DESC");
  if (roles.length === 0) return [];

  const allRolePerms = await query("SELECT role_id, permission_id FROM role_permissions");
  const permsMap = {};
  allRolePerms.forEach(rp => {
    if (!permsMap[rp.role_id]) {
      permsMap[rp.role_id] = [];
    }
    permsMap[rp.role_id].push(rp.permission_id);
  });

  return roles.map(role => ({
    ...role,
    permissionIds: permsMap[role.id] || []
  }));
}

async function getRoleById(id) {
  const roles = await query("SELECT * FROM roles WHERE id = ?", [id]);
  if (roles.length === 0) return null;

  const role = roles[0];
  const permissions = await query(
    "SELECT permission_id FROM role_permissions WHERE role_id = ?",
    [id]
  );
  role.permissionIds = permissions.map((p) => p.permission_id);
  return role;
}

async function updateRole(id, { name, description }) {
  const role = await getRoleById(id);
  if (!role) {
    throw new AppError("Role not found", 404);
  }

  // Prevent renaming Super Admin
  if (role.name === "Super Admin" && name !== "Super Admin") {
    throw new AppError("Cannot rename the Super Admin role", 400);
  }

  const existing = await query("SELECT id FROM roles WHERE name = ? AND id != ?", [name, id]);
  if (existing.length > 0) {
    throw new AppError("Role name already exists", 400);
  }

  await query("UPDATE roles SET name = ?, description = ? WHERE id = ?", [name, description, id]);
  return { id, name, description };
}

async function deleteRole(id) {
  const role = await getRoleById(id);
  if (!role) {
    throw new AppError("Role not found", 404);
  }

  if (role.name === "Super Admin") {
    throw new AppError("Cannot delete the Super Admin role", 400);
  }

  await query("DELETE FROM roles WHERE id = ?", [id]);
}

async function assignPermissionsToRole(roleId, permissionIds) {
  const role = await getRoleById(roleId);
  if (!role) {
    throw new AppError("Role not found", 404);
  }

  return await transaction(async (connection) => {
    // 1. Delete existing permissions
    await connection.execute("DELETE FROM role_permissions WHERE role_id = ?", [roleId]);

    // 2. Insert new permissions mapping
    if (permissionIds.length > 0) {
      for (const permId of permissionIds) {
        // Verify permission exists
        const [permCheck] = await connection.execute("SELECT id FROM permissions WHERE id = ?", [permId]);
        if (permCheck.length === 0) {
          throw new AppError(`Permission ID ${permId} does not exist`, 400);
        }

        await connection.execute(
          "INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)",
          [roleId, permId]
        );
      }
    }
  });
}

module.exports = {
  createRole,
  getAllRoles,
  getRoleById,
  updateRole,
  deleteRole,
  assignPermissionsToRole,
};
