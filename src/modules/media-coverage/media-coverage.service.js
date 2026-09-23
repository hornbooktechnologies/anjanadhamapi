const { query } = require("../../config/database");
const AppError = require("../../utils/AppError");
const { uploadBase64File, deleteStoredFile } = require("../../utils/fileUpload");
const { getNextSequence } = require("../../utils/sequence");
const {
  saveEntityTranslations,
  deleteEntityTranslations,
  overlayEntityTranslations,
} = require("../translations/translations.service");

const TRANSLATABLE_FIELDS = ["title", "description", "media_name"];

let tablesEnsured = false;

async function ensureMediaCoverageTable() {
  if (tablesEnsured) return;

  await query(
    `CREATE TABLE IF NOT EXISTS media_coverage (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT NULL,
      media_type ENUM('image', 'video') DEFAULT 'image',
      media_url VARCHAR(1000) NOT NULL,
      thumbnail_url VARCHAR(1000) NULL,
      media_name VARCHAR(255) NULL,
      media_link VARCHAR(1000) NULL,
      sequence INT DEFAULT 0,
      status ENUM('active','inactive') DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );

  // Ensure default permissions exist in permissions table
  try {
    const defaultPermissions = [
      { name: "media_coverage.view", module: "media_coverage" },
      { name: "media_coverage.create", module: "media_coverage" },
      { name: "media_coverage.update", module: "media_coverage" },
      { name: "media_coverage.delete", module: "media_coverage" },
    ];
    for (const perm of defaultPermissions) {
      const existing = await query("SELECT id FROM permissions WHERE name = ?", [perm.name]);
      if (existing.length === 0) {
        await query("INSERT INTO permissions (name, module) VALUES (?, ?)", [perm.name, perm.module]);
      }
    }
  } catch (permError) {
    console.error("Warning: Failed to ensure media_coverage permissions:", permError.message);
  }

  tablesEnsured = true;
}

function detectMediaType(url) {
  if (!url) return "image";
  const ext = url.split(".").pop().toLowerCase();
  if (["mp4", "webm", "mov", "avi", "mkv"].includes(ext) || url.startsWith("data:video/")) {
    return "video";
  }
  return "image";
}

async function getAllMediaCoverage({ search = "", status = "", page = 1, limit = 10, lang = "en" } = {}) {
  await ensureMediaCoverageTable();

  const offset = (Number(page) - 1) * Number(limit);
  const where = [];
  const params = [];

  if (search) {
    where.push("(m.title LIKE ? OR m.description LIKE ? OR m.media_name LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (status) {
    where.push("m.status = ?");
    params.push(status);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const countRes = await query(`SELECT COUNT(*) as total FROM media_coverage m ${whereSql}`, params);
  const total = countRes[0]?.total || 0;

  const rows = await query(
    `SELECT m.*
     FROM media_coverage m
     ${whereSql}
     ORDER BY m.sequence ASC, m.id DESC
     LIMIT ? OFFSET ?`,
    [...params, parseInt(limit, 10), parseInt(offset, 10)]
  );

  return {
    data: await overlayEntityTranslations("media_coverage", rows, lang, TRANSLATABLE_FIELDS),
    pagination: {
      total,
      current_page: parseInt(page, 10),
      per_page: parseInt(limit, 10),
      last_page: Math.ceil(total / limit) || 1,
    },
  };
}

async function getMediaCoverageById(id, lang = "en") {
  await ensureMediaCoverageTable();

  const rows = await query("SELECT * FROM media_coverage WHERE id = ?", [id]);
  if (!rows.length) {
    throw new AppError("Media coverage record not found", 404);
  }

  return overlayEntityTranslations("media_coverage", rows[0], lang, TRANSLATABLE_FIELDS);
}

async function createMediaCoverage(data) {
  await ensureMediaCoverageTable();

  const sequence = data.sequence !== undefined && data.sequence !== null
    ? Number(data.sequence)
    : await getNextSequence("media_coverage");

  let mediaUrl = data.media_url;
  if (mediaUrl && mediaUrl.startsWith("data:")) {
    mediaUrl = await uploadBase64File(mediaUrl, "media_coverage");
  }

  let thumbnailUrl = data.thumbnail_url || null;
  if (thumbnailUrl && thumbnailUrl.startsWith("data:")) {
    thumbnailUrl = await uploadBase64File(thumbnailUrl, "media_coverage");
  }

  const mediaType = data.media_type || detectMediaType(mediaUrl);

  const res = await query(
    `INSERT INTO media_coverage (title, description, media_type, media_url, thumbnail_url, media_name, media_link, sequence, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.title,
      data.description || "",
      mediaType,
      mediaUrl,
      thumbnailUrl,
      data.media_name || "",
      data.media_link || "",
      sequence,
      data.status || "active",
    ]
  );

  if (data.translations) {
    await saveEntityTranslations("media_coverage", res.insertId, data.translations);
  }

  return getMediaCoverageById(res.insertId);
}

async function updateMediaCoverage(id, data) {
  await ensureMediaCoverageTable();

  const existing = await getMediaCoverageById(id);

  let mediaUrl = data.media_url !== undefined ? data.media_url : existing.media_url;
  if (mediaUrl && mediaUrl.startsWith("data:")) {
    mediaUrl = await uploadBase64File(mediaUrl, "media_coverage");
  }

  let thumbnailUrl = data.thumbnail_url !== undefined ? data.thumbnail_url : existing.thumbnail_url;
  if (thumbnailUrl && thumbnailUrl.startsWith("data:")) {
    thumbnailUrl = await uploadBase64File(thumbnailUrl, "media_coverage");
  }

  const mediaType = data.media_type || (data.media_url ? detectMediaType(mediaUrl) : existing.media_type);

  // Delete old files if replaced
  if (existing.media_url && existing.media_url !== mediaUrl && existing.media_url.startsWith("/uploads/")) {
    try {
      deleteStoredFile(existing.media_url);
    } catch (err) {
      // ignore
    }
  }

  if (existing.thumbnail_url && existing.thumbnail_url !== thumbnailUrl && existing.thumbnail_url.startsWith("/uploads/")) {
    try {
      deleteStoredFile(existing.thumbnail_url);
    } catch (err) {
      // ignore
    }
  }

  await query(
    `UPDATE media_coverage
     SET title = ?, description = ?, media_type = ?, media_url = ?, thumbnail_url = ?, media_name = ?, media_link = ?, sequence = ?, status = ?
     WHERE id = ?`,
    [
      data.title !== undefined ? data.title : existing.title,
      data.description !== undefined ? data.description : existing.description,
      mediaType,
      mediaUrl,
      thumbnailUrl,
      data.media_name !== undefined ? data.media_name : existing.media_name,
      data.media_link !== undefined ? data.media_link : existing.media_link,
      data.sequence !== undefined ? Number(data.sequence) : (existing.sequence ?? 0),
      data.status || existing.status || "active",
      id,
    ]
  );

  if (data.translations) {
    await saveEntityTranslations("media_coverage", id, data.translations);
  }

  return getMediaCoverageById(id);
}

async function deleteMediaCoverage(id) {
  await ensureMediaCoverageTable();

  const record = await getMediaCoverageById(id);

  if (record.media_url && record.media_url.startsWith("/uploads/")) {
    try {
      deleteStoredFile(record.media_url);
    } catch (err) {
      // ignore
    }
  }

  if (record.thumbnail_url && record.thumbnail_url.startsWith("/uploads/")) {
    try {
      deleteStoredFile(record.thumbnail_url);
    } catch (err) {
      // ignore
    }
  }

  await query("DELETE FROM media_coverage WHERE id = ?", [id]);
  await deleteEntityTranslations("media_coverage", id);
}

async function toggleMediaCoverageStatus(id) {
  await ensureMediaCoverageTable();

  const record = await getMediaCoverageById(id);
  const next = record.status === "active" ? "inactive" : "active";
  await query("UPDATE media_coverage SET status = ? WHERE id = ?", [next, id]);
  return { ...record, status: next };
}

module.exports = {
  ensureMediaCoverageTable,
  getAllMediaCoverage,
  getMediaCoverageById,
  createMediaCoverage,
  updateMediaCoverage,
  deleteMediaCoverage,
  toggleMediaCoverageStatus,
};
