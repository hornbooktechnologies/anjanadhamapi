const { query } = require("../../config/database");
const AppError = require("../../utils/AppError");
const { uploadBase64File, deleteStoredFile } = require("../../utils/fileUpload");
const { getNextSequence } = require("../../utils/sequence");
const {
  saveEntityTranslations,
  deleteEntityTranslations,
  overlayEntityTranslations,
} = require("../translations/translations.service");

const TRANSLATABLE_FIELDS = ["title", "description"];

let tablesEnsured = false;

async function ensureGalleryVideosTable() {
  if (tablesEnsured) return;

  await query(
    `CREATE TABLE IF NOT EXISTS gallery_videos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT NULL,
      video_url VARCHAR(1000) NOT NULL,
      thumbnail_url VARCHAR(1000) NULL,
      sequence INT DEFAULT 0,
      status ENUM('active','inactive') DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );

  tablesEnsured = true;
}

async function getAllGalleryVideos({ search = "", status = "", page = 1, limit = 10, lang = "en" } = {}) {
  await ensureGalleryVideosTable();

  const offset = (Number(page) - 1) * Number(limit);
  const where = [];
  const params = [];

  if (search) {
    where.push("(v.title LIKE ? OR v.description LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }
  if (status) {
    where.push("v.status = ?");
    params.push(status);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const countRes = await query(`SELECT COUNT(*) as total FROM gallery_videos v ${whereSql}`, params);
  const total = countRes[0]?.total || 0;

  const rows = await query(
    `SELECT v.*
     FROM gallery_videos v
     ${whereSql}
     ORDER BY v.sequence ASC, v.id DESC
     LIMIT ? OFFSET ?`,
    [...params, parseInt(limit, 10), parseInt(offset, 10)]
  );

  return {
    data: await overlayEntityTranslations("gallery_videos", rows, lang, TRANSLATABLE_FIELDS),
    pagination: {
      total,
      current_page: parseInt(page, 10),
      per_page: parseInt(limit, 10),
      last_page: Math.ceil(total / limit) || 1,
    },
  };
}

async function getGalleryVideoById(id, lang = "en") {
  await ensureGalleryVideosTable();

  const rows = await query("SELECT * FROM gallery_videos WHERE id = ?", [id]);
  if (!rows.length) {
    throw new AppError("Gallery video not found", 404);
  }

  return overlayEntityTranslations("gallery_videos", rows[0], lang, TRANSLATABLE_FIELDS);
}

async function createGalleryVideo(data) {
  await ensureGalleryVideosTable();

  const sequence = data.sequence !== undefined && data.sequence !== null
    ? Number(data.sequence)
    : await getNextSequence("gallery_videos");

  let videoUrl = data.video_url;
  if (videoUrl && videoUrl.startsWith("data:")) {
    videoUrl = await uploadBase64File(videoUrl, "gallery_videos");
  }

  let thumbnailUrl = data.thumbnail_url || null;
  if (thumbnailUrl && thumbnailUrl.startsWith("data:")) {
    thumbnailUrl = await uploadBase64File(thumbnailUrl, "gallery_videos");
  }

  const res = await query(
    `INSERT INTO gallery_videos (title, description, video_url, thumbnail_url, sequence, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      data.title,
      data.description || "",
      videoUrl,
      thumbnailUrl,
      sequence,
      data.status || "active",
    ]
  );

  if (data.translations) {
    await saveEntityTranslations("gallery_videos", res.insertId, data.translations);
  }

  return getGalleryVideoById(res.insertId);
}

async function updateGalleryVideo(id, data) {
  await ensureGalleryVideosTable();

  const existing = await getGalleryVideoById(id);

  let videoUrl = data.video_url !== undefined ? data.video_url : existing.video_url;
  if (videoUrl && videoUrl.startsWith("data:")) {
    videoUrl = await uploadBase64File(videoUrl, "gallery_videos");
  }

  let thumbnailUrl = data.thumbnail_url !== undefined ? data.thumbnail_url : existing.thumbnail_url;
  if (thumbnailUrl && thumbnailUrl.startsWith("data:")) {
    thumbnailUrl = await uploadBase64File(thumbnailUrl, "gallery_videos");
  }

  // Delete old stored files if replaced
  if (existing.video_url && existing.video_url !== videoUrl && existing.video_url.startsWith("/uploads/")) {
    try {
      deleteStoredFile(existing.video_url);
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
    `UPDATE gallery_videos
     SET title = ?, description = ?, video_url = ?, thumbnail_url = ?, sequence = ?, status = ?
     WHERE id = ?`,
    [
      data.title !== undefined ? data.title : existing.title,
      data.description !== undefined ? data.description : existing.description,
      videoUrl,
      thumbnailUrl,
      data.sequence !== undefined ? Number(data.sequence) : (existing.sequence ?? 0),
      data.status || existing.status || "active",
      id,
    ]
  );

  if (data.translations) {
    await saveEntityTranslations("gallery_videos", id, data.translations);
  }

  return getGalleryVideoById(id);
}

async function deleteGalleryVideo(id) {
  await ensureGalleryVideosTable();

  const video = await getGalleryVideoById(id);

  // Delete stored files for video and thumbnail
  if (video.video_url && video.video_url.startsWith("/uploads/")) {
    try {
      deleteStoredFile(video.video_url);
    } catch (err) {
      // ignore
    }
  }

  if (video.thumbnail_url && video.thumbnail_url.startsWith("/uploads/")) {
    try {
      deleteStoredFile(video.thumbnail_url);
    } catch (err) {
      // ignore
    }
  }

  await query("DELETE FROM gallery_videos WHERE id = ?", [id]);
  await deleteEntityTranslations("gallery_videos", id);
}

async function toggleGalleryVideoStatus(id) {
  await ensureGalleryVideosTable();

  const video = await getGalleryVideoById(id);
  const next = video.status === "active" ? "inactive" : "active";
  await query("UPDATE gallery_videos SET status = ? WHERE id = ?", [next, id]);
  return { ...video, status: next };
}

module.exports = {
  ensureGalleryVideosTable,
  getAllGalleryVideos,
  getGalleryVideoById,
  createGalleryVideo,
  updateGalleryVideo,
  deleteGalleryVideo,
  toggleGalleryVideoStatus,
};
