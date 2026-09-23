const { query } = require("../../config/database");
const AppError = require("../../utils/AppError");
const { uploadBase64File, deleteStoredFile } = require("../../utils/fileUpload");
const { getNextSequence, resequenceTable } = require("../../utils/sequence");
const {
  saveEntityTranslations,
  deleteEntityTranslations,
  overlayEntityTranslations,
} = require("../translations/translations.service");

const TRANSLATABLE_FIELDS = [
  "title",
  "category",
  "short_description",
  "description",
  "metric",
  "image_alt",
];

async function ensureFacilitiesTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS facilities (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      category VARCHAR(100) NULL,
      short_description TEXT NULL,
      description LONGTEXT NULL,
      metric VARCHAR(100) NULL,
      image_url TEXT NULL,
      image_alt VARCHAR(255) NULL,
      sequence INT DEFAULT 0,
      status ENUM('active','inactive') DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

async function getAllFacilities({ search = "", category = "", status = "", page, limit, lang = "en" } = {}) {
  await ensureFacilitiesTable();
  const where = [];
  const params = [];

  if (search && search.trim()) {
    where.push("(title LIKE ? OR short_description LIKE ? OR description LIKE ? OR category LIKE ? OR metric LIKE ?)");
    params.push(`%${search.trim()}%`, `%${search.trim()}%`, `%${search.trim()}%`, `%${search.trim()}%`, `%${search.trim()}%`);
  }
  if (category && category.trim() && category !== "all") {
    where.push("category = ?");
    params.push(category.trim());
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

    const countRes = await query(`SELECT COUNT(*) as total FROM facilities ${whereSql}`, params);
    const total = countRes[0]?.total || 0;

    const rows = await query(
      `SELECT * FROM facilities ${whereSql} ORDER BY sequence ASC, id DESC LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    const translatedRows = await overlayEntityTranslations("facilities", rows, lang, TRANSLATABLE_FIELDS);

    return {
      data: translatedRows,
      pagination: {
        total,
        per_page: limitNum,
        current_page: pageNum,
        last_page: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  const rows = await query(`SELECT * FROM facilities ${whereSql} ORDER BY sequence ASC, id DESC`, params);
  return overlayEntityTranslations("facilities", rows, lang, TRANSLATABLE_FIELDS);
}

async function getFacilityById(id, lang = "en") {
  await ensureFacilitiesTable();
  const rows = await query("SELECT * FROM facilities WHERE id = ?", [id]);
  if (!rows.length) throw new AppError("Facility not found", 404);
  return overlayEntityTranslations("facilities", rows[0], lang, TRANSLATABLE_FIELDS);
}

async function createFacility(data) {
  await ensureFacilitiesTable();
  const {
    translations,
    title,
    category = "",
    short_description = "",
    description = "",
    metric = "",
    image_url,
    image_alt = "",
    status = "active",
  } = data;

  let sequence = data.sequence;
  if (sequence === undefined || sequence === null || sequence === 0) {
    sequence = await getNextSequence("facilities");
  }

  let savedImage = image_url;
  if (image_url && image_url.startsWith("data:")) {
    savedImage = await uploadBase64File(image_url, "facilities");
  }

  const result = await query(
    `INSERT INTO facilities (title, category, short_description, description, metric, image_url, image_alt, sequence, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      title ? title.trim() : "",
      category ? category.trim() : null,
      short_description ? short_description.trim() : null,
      description ? description.trim() : null,
      metric ? metric.trim() : null,
      savedImage || null,
      image_alt ? image_alt.trim() : (title ? title.trim() : null),
      sequence,
      status,
    ]
  );

  if (translations) {
    await saveEntityTranslations("facilities", result.insertId, translations);
  }

  return getFacilityById(result.insertId);
}

async function updateFacility(id, data) {
  await ensureFacilitiesTable();
  const prev = await getFacilityById(id);
  const {
    translations,
    title,
    category = "",
    short_description = "",
    description = "",
    metric = "",
    image_url,
    image_alt = "",
    status = "active",
  } = data;
  const sequence = data.sequence !== undefined && data.sequence !== null ? Number(data.sequence) : prev.sequence;

  let savedImage = image_url !== undefined ? image_url : prev.image_url;
  if (image_url && image_url.startsWith("data:")) {
    savedImage = await uploadBase64File(image_url, "facilities");
    if (prev.image_url && prev.image_url.startsWith("/uploads/")) {
      try { deleteStoredFile(prev.image_url); } catch (e) { }
    }
  }

  await query(
    `UPDATE facilities
     SET title = ?, category = ?, short_description = ?, description = ?, metric = ?, image_url = ?, image_alt = ?, sequence = ?, status = ?
     WHERE id = ?`,
    [
      title !== undefined ? title.trim() : prev.title,
      category !== undefined ? (category ? category.trim() : null) : prev.category,
      short_description !== undefined ? (short_description ? short_description.trim() : null) : prev.short_description,
      description !== undefined ? (description ? description.trim() : null) : prev.description,
      metric !== undefined ? (metric ? metric.trim() : null) : prev.metric,
      savedImage,
      image_alt !== undefined ? (image_alt ? image_alt.trim() : null) : prev.image_alt,
      sequence,
      status || prev.status,
      id,
    ]
  );

  if (translations) {
    await saveEntityTranslations("facilities", id, translations);
  }

  return getFacilityById(id);
}

async function deleteFacility(id) {
  await ensureFacilitiesTable();
  const facility = await getFacilityById(id);
  if (facility.image_url && facility.image_url.startsWith("/uploads/")) {
    try { deleteStoredFile(facility.image_url); } catch (e) { }
  }

  await query("DELETE FROM facilities WHERE id = ?", [id]);
  await deleteEntityTranslations("facilities", id);
  await resequenceTable("facilities");
  return { id: Number(id), deleted: true };
}

async function toggleFacilityStatus(id) {
  await ensureFacilitiesTable();
  const facility = await getFacilityById(id);
  const nextStatus = facility.status === "active" ? "inactive" : "active";
  await query("UPDATE facilities SET status = ? WHERE id = ?", [nextStatus, id]);
  return { ...facility, status: nextStatus };
}

module.exports = {
  getAllFacilities,
  getFacilityById,
  createFacility,
  updateFacility,
  deleteFacility,
  toggleFacilityStatus,
};
