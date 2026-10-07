const { query } = require("../../config/database");
const AppError = require("../../utils/AppError");
const { uploadBase64File, deleteStoredFile } = require("../../utils/fileUpload");
const { getNextSequence } = require("../../utils/sequence");
const {
  saveEntityTranslations,
  deleteEntityTranslations,
  overlayEntityTranslations,
} = require("../translations/translations.service");

const TRANSLATABLE_FIELDS = ["name", "designation", "location", "short_description", "description", "photo_alt"];

async function ensureKeyMembersTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS key_members (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      designation VARCHAR(255) NULL,
      location VARCHAR(255) NULL,
      short_description TEXT NULL,
      description LONGTEXT NULL,
      photo_url TEXT NULL,
      photo_alt VARCHAR(255) NULL,
      sequence INT DEFAULT 0,
      status ENUM('active','inactive') DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

async function getAllKeyMembers({ search = "", designation = "", status = "", page, limit, lang = "en" } = {}) {
  await ensureKeyMembersTable();
  const where = [];
  const params = [];

  if (search && search.trim()) {
    where.push("(name LIKE ? OR designation LIKE ? OR location LIKE ? OR short_description LIKE ? OR description LIKE ?)");
    params.push(`%${search.trim()}%`, `%${search.trim()}%`, `%${search.trim()}%`, `%${search.trim()}%`, `%${search.trim()}%`);
  }
  if (designation && designation.trim() && designation !== "all") {
    where.push("designation = ?");
    params.push(designation.trim());
  }
  if (status && status.trim() && status !== "all") {
    where.push("status = ?");
    params.push(status.trim());
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  if (page !== undefined && limit !== undefined) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const offset = (pageNum - 1) * limitNum;

    const countRes = await query(`SELECT COUNT(*) as total FROM key_members ${whereSql}`, params);
    const total = countRes[0]?.total || 0;

    const rows = await query(
      `SELECT * FROM key_members ${whereSql} ORDER BY sequence ASC, id DESC LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    return {
      data: await overlayEntityTranslations("key_members", rows, lang, TRANSLATABLE_FIELDS),
      pagination: {
        total,
        per_page: limitNum,
        current_page: pageNum,
        last_page: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  const rows = await query(`SELECT * FROM key_members ${whereSql} ORDER BY sequence ASC, id DESC`, params);
  return overlayEntityTranslations("key_members", rows, lang, TRANSLATABLE_FIELDS);
}

async function getKeyMemberById(id, lang = "en") {
  await ensureKeyMembersTable();
  const rows = await query("SELECT * FROM key_members WHERE id = ?", [id]);
  if (!rows.length) throw new AppError("Key member not found", 404);
  return overlayEntityTranslations("key_members", rows[0], lang, TRANSLATABLE_FIELDS);
}

async function createKeyMember(data) {
  await ensureKeyMembersTable();
  const {
    translations,
    name,
    designation = "",
    location = "",
    short_description = "",
    description = "",
    photo_url,
    photo_alt = "",
    status = "active",
  } = data;

  let sequence = data.sequence;
  if (sequence === undefined || sequence === null || sequence === 0) {
    sequence = await getNextSequence("key_members");
  }

  let savedPhoto = photo_url;
  if (photo_url && photo_url.startsWith("data:")) {
    savedPhoto = await uploadBase64File(photo_url, "key_members");
  }

  const result = await query(
    `INSERT INTO key_members (name, designation, location, short_description, description, photo_url, photo_alt, sequence, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name ? name.trim() : "",
      designation ? designation.trim() : null,
      location ? location.trim() : null,
      short_description ? short_description.trim() : null,
      description ? description.trim() : null,
      savedPhoto || null,
      photo_alt ? photo_alt.trim() : (name ? name.trim() : null),
      sequence,
      status,
    ]
  );

  if (translations) {
    await saveEntityTranslations("key_members", result.insertId, translations);
  }

  return getKeyMemberById(result.insertId);
}

async function updateKeyMember(id, data) {
  await ensureKeyMembersTable();
  const prev = await getKeyMemberById(id);
  const {
    translations,
    name,
    designation = "",
    location = "",
    short_description = "",
    description = "",
    photo_url,
    photo_alt = "",
    status = "active",
  } = data;
  const sequence = data.sequence !== undefined && data.sequence !== null ? Number(data.sequence) : prev.sequence;

  let savedPhoto = photo_url !== undefined ? photo_url : prev.photo_url;
  if (photo_url && photo_url.startsWith("data:")) {
    savedPhoto = await uploadBase64File(photo_url, "key_members");
    if (prev.photo_url && prev.photo_url.startsWith("/uploads/")) {
      try { deleteStoredFile(prev.photo_url); } catch (e) { }
    }
  }

  await query(
    `UPDATE key_members
     SET name = ?, designation = ?, location = ?, short_description = ?, description = ?, photo_url = ?, photo_alt = ?, sequence = ?, status = ?
     WHERE id = ?`,
    [
      name !== undefined ? name.trim() : prev.name,
      designation !== undefined ? (designation ? designation.trim() : null) : prev.designation,
      location !== undefined ? (location ? location.trim() : null) : prev.location,
      short_description !== undefined ? (short_description ? short_description.trim() : null) : prev.short_description,
      description !== undefined ? (description ? description.trim() : null) : prev.description,
      savedPhoto,
      photo_alt !== undefined ? (photo_alt ? photo_alt.trim() : null) : prev.photo_alt,
      sequence,
      status || prev.status,
      id,
    ]
  );

  if (translations) {
    await saveEntityTranslations("key_members", id, translations);
  }

  return getKeyMemberById(id);
}

async function deleteKeyMember(id) {
  await ensureKeyMembersTable();
  const member = await getKeyMemberById(id);
  if (member.photo_url && member.photo_url.startsWith("/uploads/")) {
    try { deleteStoredFile(member.photo_url); } catch (e) { }
  }

  await query("DELETE FROM key_members WHERE id = ?", [id]);
  await deleteEntityTranslations("key_members", id);
  return { id: Number(id), deleted: true };
}

async function toggleKeyMemberStatus(id) {
  await ensureKeyMembersTable();
  const member = await getKeyMemberById(id);
  const nextStatus = member.status === "active" ? "inactive" : "active";
  await query("UPDATE key_members SET status = ? WHERE id = ?", [nextStatus, id]);
  return { ...member, status: nextStatus };
}

module.exports = {
  getAllKeyMembers,
  getKeyMemberById,
  createKeyMember,
  updateKeyMember,
  deleteKeyMember,
  toggleKeyMemberStatus,
};
