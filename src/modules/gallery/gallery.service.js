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

async function ensureGalleryTables() {
  if (tablesEnsured) return;

  await query(
    `CREATE TABLE IF NOT EXISTS gallery (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT NULL,
      is_default TINYINT(1) DEFAULT 0,
      sequence INT DEFAULT 0,
      status ENUM('active','inactive') DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );

  await query(
    `CREATE TABLE IF NOT EXISTS gallery_images (
      id INT AUTO_INCREMENT PRIMARY KEY,
      gallery_id INT NOT NULL,
      image_url VARCHAR(1000) NOT NULL,
      image_alt VARCHAR(255) NULL,
      sequence INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_gallery_images_gallery_id (gallery_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );

  // Ensure default permissions exist in permissions table
  try {
    const defaultPermissions = [
      { name: "gallery.view", module: "gallery" },
      { name: "gallery.create", module: "gallery" },
      { name: "gallery.update", module: "gallery" },
      { name: "gallery.delete", module: "gallery" },
    ];
    for (const perm of defaultPermissions) {
      const existing = await query("SELECT id FROM permissions WHERE name = ?", [perm.name]);
      if (existing.length === 0) {
        await query("INSERT INTO permissions (name, module) VALUES (?, ?)", [perm.name, perm.module]);
      }
    }
  } catch (permError) {
    console.error("Warning: Failed to ensure gallery permissions:", permError.message);
  }

  tablesEnsured = true;
}

function normalizeGalleryRecord(row, images = []) {
  return {
    ...row,
    is_default: Boolean(row.is_default),
    images,
  };
}

async function getAllGalleries({ search = "", status = "", page = 1, limit = 10, lang = "en" } = {}) {
  await ensureGalleryTables();

  const offset = (Number(page) - 1) * Number(limit);
  const where = [];
  const params = [];

  if (search) {
    where.push("(g.title LIKE ? OR g.description LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }
  if (status) {
    where.push("g.status = ?");
    params.push(status);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const countRes = await query(`SELECT COUNT(*) as total FROM gallery g ${whereSql}`, params);
  const total = countRes[0]?.total || 0;

  const rows = await query(
    `SELECT g.*,
      (SELECT gi.image_url FROM gallery_images gi WHERE gi.gallery_id = g.id ORDER BY gi.sequence ASC, gi.id ASC LIMIT 1) AS cover_image,
      (SELECT COUNT(*) FROM gallery_images gi WHERE gi.gallery_id = g.id) AS image_count
     FROM gallery g
     ${whereSql}
     ORDER BY g.is_default DESC, g.sequence ASC, g.id DESC
     LIMIT ? OFFSET ?`,
    [...params, parseInt(limit, 10), parseInt(offset, 10)]
  );

  const normalizedRows = rows.map((row) => ({
      ...row,
      is_default: Boolean(row.is_default),
      image_count: Number(row.image_count || 0),
    }));
  const translatedRows = await overlayEntityTranslations("gallery", normalizedRows, lang, TRANSLATABLE_FIELDS);

  return {
    data: translatedRows,
    pagination: {
      total,
      current_page: parseInt(page, 10),
      per_page: parseInt(limit, 10),
      last_page: Math.ceil(total / limit) || 1,
    },
  };
}

async function getGalleryById(id, lang = "en") {
  await ensureGalleryTables();

  const rows = await query("SELECT * FROM gallery WHERE id = ?", [id]);
  if (!rows.length) {
    throw new AppError("Gallery not found", 404);
  }

  const images = await query(
    "SELECT * FROM gallery_images WHERE gallery_id = ? ORDER BY sequence ASC, id ASC",
    [id]
  );

  const record = normalizeGalleryRecord(rows[0], images);
  return overlayEntityTranslations("gallery", record, lang, TRANSLATABLE_FIELDS);
}

async function createGallery(data) {
  await ensureGalleryTables();

  const sequence = data.sequence !== undefined && data.sequence !== null
    ? Number(data.sequence)
    : await getNextSequence("gallery");

  const isDefault = Boolean(data.is_default);

  // If this gallery is set as default, reset all other galleries
  if (isDefault) {
    await query("UPDATE gallery SET is_default = 0");
  }

  const res = await query(
    `INSERT INTO gallery (title, description, is_default, sequence, status)
     VALUES (?, ?, ?, ?, ?)`,
    [
      data.title,
      data.description || "",
      isDefault ? 1 : 0,
      sequence,
      data.status || "active",
    ]
  );

  const galleryId = res.insertId;

  // Handle images if provided
  if (Array.isArray(data.images) && data.images.length > 0) {
    for (let i = 0; i < data.images.length; i++) {
      const img = data.images[i];
      let imageUrl = img.image_url;
      if (imageUrl && imageUrl.startsWith("data:")) {
        imageUrl = await uploadBase64File(imageUrl, "gallery");
      }
      if (imageUrl) {
        await query(
          `INSERT INTO gallery_images (gallery_id, image_url, image_alt, sequence)
           VALUES (?, ?, ?, ?)`,
          [galleryId, imageUrl, img.image_alt || "", img.sequence !== undefined ? Number(img.sequence) : i + 1]
        );
      }
    }
  }

  if (data.translations) {
    await saveEntityTranslations("gallery", galleryId, data.translations);
  }

  return getGalleryById(galleryId);
}

async function updateGallery(id, data) {
  await ensureGalleryTables();

  const existing = await getGalleryById(id); // Ensure exists

  const isDefault = Boolean(data.is_default);

  // If this gallery is marked as default, clear default for all other galleries
  if (isDefault) {
    await query("UPDATE gallery SET is_default = 0 WHERE id != ?", [id]);
  }

  await query(
    `UPDATE gallery
     SET title = ?, description = ?, is_default = ?, sequence = ?, status = ?
     WHERE id = ?`,
    [
      data.title,
      data.description || "",
      isDefault ? 1 : 0,
      data.sequence !== undefined ? Number(data.sequence) : (existing.sequence ?? 0),
      data.status || "active",
      id,
    ]
  );

  // If images array is provided, sync images
  if (Array.isArray(data.images)) {
    const existingImages = await query("SELECT * FROM gallery_images WHERE gallery_id = ?", [id]);

    const newImageUrls = new Set(data.images.map((img) => img.image_url).filter(Boolean));

    // Delete stored files for removed images
    for (const oldImg of existingImages) {
      if (!newImageUrls.has(oldImg.image_url) && oldImg.image_url.startsWith("/uploads/")) {
        try {
          deleteStoredFile(oldImg.image_url);
        } catch (err) {
          // ignore cleanup errors
        }
      }
    }

    // Clear old image rows and re-insert
    await query("DELETE FROM gallery_images WHERE gallery_id = ?", [id]);

    for (let i = 0; i < data.images.length; i++) {
      const img = data.images[i];
      let imageUrl = img.image_url;
      if (imageUrl && imageUrl.startsWith("data:")) {
        imageUrl = await uploadBase64File(imageUrl, "gallery");
      }
      if (imageUrl) {
        await query(
          `INSERT INTO gallery_images (gallery_id, image_url, image_alt, sequence)
           VALUES (?, ?, ?, ?)`,
          [id, imageUrl, img.image_alt || "", img.sequence !== undefined ? Number(img.sequence) : i + 1]
        );
      }
    }
  }

  if (data.translations) {
    await saveEntityTranslations("gallery", id, data.translations);
  }

  return getGalleryById(id);
}

async function deleteGallery(id) {
  await ensureGalleryTables();

  const gallery = await getGalleryById(id);

  // Delete stored files for all images
  if (Array.isArray(gallery.images)) {
    for (const img of gallery.images) {
      if (img.image_url && img.image_url.startsWith("/uploads/")) {
        try {
          deleteStoredFile(img.image_url);
        } catch (err) {
          // ignore cleanup errors
        }
      }
    }
  }

  await query("DELETE FROM gallery_images WHERE gallery_id = ?", [id]);
  await query("DELETE FROM gallery WHERE id = ?", [id]);
  await deleteEntityTranslations("gallery", id);
}

async function toggleGalleryStatus(id) {
  await ensureGalleryTables();

  const gallery = await getGalleryById(id);
  const next = gallery.status === "active" ? "inactive" : "active";
  await query("UPDATE gallery SET status = ? WHERE id = ?", [next, id]);
  return { ...gallery, status: next };
}

async function setDefaultGallery(id) {
  await ensureGalleryTables();

  await getGalleryById(id); // Ensure exists

  await query("UPDATE gallery SET is_default = 0");
  await query("UPDATE gallery SET is_default = 1 WHERE id = ?", [id]);

  return getGalleryById(id);
}

module.exports = {
  ensureGalleryTables,
  getAllGalleries,
  getGalleryById,
  createGallery,
  updateGallery,
  deleteGallery,
  toggleGalleryStatus,
  setDefaultGallery,
};
