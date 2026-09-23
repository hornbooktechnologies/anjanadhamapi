const { query } = require("../../config/database");
const AppError = require("../../utils/AppError");

async function createPermission({ name, module }) {
  const existing = await query("SELECT id FROM permissions WHERE name = ?", [name]);
  if (existing.length > 0) {
    throw new AppError("Permission already exists", 400);
  }

  const result = await query("INSERT INTO permissions (name, module) VALUES (?, ?)", [
    name,
    module,
  ]);
  return { id: result.insertId, name, module };
}

async function getAllPermissions() {
  return await query("SELECT * FROM permissions ORDER BY id DESC");
}

async function getPermissionById(id) {
  const perms = await query("SELECT * FROM permissions WHERE id = ?", [id]);
  return perms[0] || null;
}

async function updatePermission(id, { name, module }) {
  const perm = await getPermissionById(id);
  if (!perm) {
    throw new AppError("Permission not found", 404);
  }

  const existing = await query("SELECT id FROM permissions WHERE name = ? AND id != ?", [name, id]);
  if (existing.length > 0) {
    throw new AppError("Permission name already exists", 400);
  }

  await query("UPDATE permissions SET name = ?, module = ? WHERE id = ?", [name, module, id]);
  return { id, name, module };
}

async function deletePermission(id) {
  const perm = await getPermissionById(id);
  if (!perm) {
    throw new AppError("Permission not found", 404);
  }

  await query("DELETE FROM permissions WHERE id = ?", [id]);
}

module.exports = {
  createPermission,
  getAllPermissions,
  getPermissionById,
  updatePermission,
  deletePermission,
};
