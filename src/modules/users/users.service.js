const bcrypt = require("bcryptjs");
const { query, transaction } = require("../../config/database");
const AppError = require("../../utils/AppError");

async function assignRolesToUser(userId, roleIds) {
  // Check if user exists
  const users = await query("SELECT id FROM users WHERE id = ?", [userId]);
  if (users.length === 0) {
    throw new AppError("User not found", 404);
  }

  return await transaction(async (connection) => {
    // 1. Delete current user role mappings
    await connection.execute("DELETE FROM user_roles WHERE user_id = ?", [userId]);

    // 2. Insert new user role mappings
    if (roleIds.length > 0) {
      for (const roleId of roleIds) {
        // Verify role exists
        const [roleCheck] = await connection.execute("SELECT id FROM roles WHERE id = ?", [roleId]);
        if (roleCheck.length === 0) {
          throw new AppError(`Role ID ${roleId} does not exist`, 400);
        }

        await connection.execute(
          "INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)",
          [userId, roleId]
        );
      }
    }
  });
}

async function getAllUsers({ search = "", page = 1, limit = 10, sortBy = "id", sortOrder = "desc", status = "" }) {
  const offset = (page - 1) * limit;
  let whereClauses = [];
  let params = [];

  if (search) {
    whereClauses.push("(u.name LIKE ? OR u.email LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }

  if (status) {
    whereClauses.push("u.status = ?");
    params.push(status);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  // Get total count
  const countResult = await query(
    `SELECT COUNT(DISTINCT u.id) as total FROM users u ${whereSql}`,
    params
  );
  const total = countResult[0]?.total || 0;

  // Validate sort parameters
  const allowedSortFields = ["id", "name", "email", "status", "created_at"];
  const cleanSortBy = allowedSortFields.includes(sortBy) ? sortBy : "id";
  const cleanSortOrder = ["asc", "desc"].includes(sortOrder.toLowerCase()) ? sortOrder : "desc";

  // Fetch users with roles joined
  const users = await query(
    `SELECT u.id, u.name, u.email, u.status, u.created_at, u.updated_at,
     GROUP_CONCAT(r.name) as roles,
     GROUP_CONCAT(r.id) as role_ids
     FROM users u
     LEFT JOIN user_roles ur ON u.id = ur.user_id
     LEFT JOIN roles r ON ur.role_id = r.id
     ${whereSql}
     GROUP BY u.id
     ORDER BY u.${cleanSortBy} ${cleanSortOrder}
     LIMIT ? OFFSET ?`,
    [...params, parseInt(limit, 10), parseInt(offset, 10)]
  );

  return {
    users: users.map(u => ({
      ...u,
      roles: u.roles ? u.roles.split(",") : [],
      role_ids: u.role_ids ? u.role_ids.split(",").map(Number) : []
    })),
    pagination: {
      total,
      current_page: parseInt(page, 10),
      per_page: parseInt(limit, 10),
      last_page: Math.ceil(total / limit)
    }
  };
}

async function createUser({ name, email, password, roleIds = [], status = "active" }) {
  const existing = await query("SELECT id FROM users WHERE email = ?", [email]);
  if (existing.length > 0) {
    throw new AppError("Email already in use", 400);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  return await transaction(async (connection) => {
    const [result] = await connection.execute(
      "INSERT INTO users (name, email, password, status) VALUES (?, ?, ?, ?)",
      [name, email, hashedPassword, status]
    );
    const userId = result.insertId;

    if (roleIds.length > 0) {
      for (const roleId of roleIds) {
        await connection.execute(
          "INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)",
          [userId, roleId]
        );
      }
    }

    return { id: userId, name, email, status };
  });
}

async function updateUser(id, { name, email, password, roleIds = [], status }) {
  const users = await query("SELECT id FROM users WHERE id = ?", [id]);
  if (users.length === 0) {
    throw new AppError("User not found", 404);
  }

  const existing = await query("SELECT id FROM users WHERE email = ? AND id != ?", [email, id]);
  if (existing.length > 0) {
    throw new AppError("Email already in use", 400);
  }

  return await transaction(async (connection) => {
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await connection.execute(
        "UPDATE users SET name = ?, email = ?, password = ?, status = ? WHERE id = ?",
        [name, email, hashedPassword, status, id]
      );
    } else {
      await connection.execute(
        "UPDATE users SET name = ?, email = ?, status = ? WHERE id = ?",
        [name, email, status, id]
      );
    }

    // Update roles mapping
    await connection.execute("DELETE FROM user_roles WHERE user_id = ?", [id]);
    if (roleIds.length > 0) {
      for (const roleId of roleIds) {
        await connection.execute(
          "INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)",
          [id, roleId]
        );
      }
    }

    return { id, name, email, status };
  });
}

async function deleteUser(id) {
  const users = await query("SELECT id FROM users WHERE id = ?", [id]);
  if (users.length === 0) {
    throw new AppError("User not found", 404);
  }

  await query("DELETE FROM users WHERE id = ?", [id]);
}

async function updateUserStatus(id, status) {
  const users = await query("SELECT id FROM users WHERE id = ?", [id]);
  if (users.length === 0) {
    throw new AppError("User not found", 404);
  }

  await query("UPDATE users SET status = ? WHERE id = ?", [status, id]);
}

async function getUserById(id) {
  const users = await query(
    `SELECT u.id, u.name, u.email, u.status, u.created_at, u.updated_at,
     GROUP_CONCAT(r.name) as roles,
     GROUP_CONCAT(r.id) as role_ids
     FROM users u
     LEFT JOIN user_roles ur ON u.id = ur.user_id
     LEFT JOIN roles r ON ur.role_id = r.id
     WHERE u.id = ?
     GROUP BY u.id`,
    [id]
  );
  if (users.length === 0) {
    throw new AppError("User not found", 404);
  }
  const u = users[0];
  return {
    ...u,
    roles: u.roles ? u.roles.split(",") : [],
    role_ids: u.role_ids ? u.role_ids.split(",").map(Number) : []
  };
}

module.exports = {
  assignRolesToUser,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  updateUserStatus,
  getUserById,
};
