const { query } = require("../../config/database");
const AppError = require("../../utils/AppError");
const { ensureContentSeoColumns, seoValue } = require("../../utils/contentSeo");
const { uploadBase64File, deleteStoredFile } = require("../../utils/fileUpload");
const { getNextSequence, resequenceTable } = require("../../utils/sequence");
const {
  saveEntityTranslations,
  deleteEntityTranslations,
  overlayEntityTranslations,
} = require("../translations/translations.service");

const TRANSLATABLE_FIELDS = [
  "meta_title",
  "meta_description",
  "title",
  "category",
  "author",
  "read_time",
  "short_description",
  "description",
  "image_alt",
];

async function ensureBlogsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS blogs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      category VARCHAR(100) NULL,
      author VARCHAR(100) NULL,
      publish_date DATE NULL,
      read_time VARCHAR(50) NULL,
      short_description TEXT NULL,
      description LONGTEXT NULL,
      image_url TEXT NULL,
      image_alt VARCHAR(255) NULL,
      meta_title VARCHAR(255) NULL,
      meta_description TEXT NULL,
      sequence INT DEFAULT 0,
      status ENUM('active','inactive') DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  await ensureContentSeoColumns("blogs");
}

async function getAllBlogs({ search = "", category = "", status = "", page, limit, lang = "en" } = {}) {
  await ensureBlogsTable();
  const where = [];
  const params = [];

  if (search && search.trim()) {
    where.push("(title LIKE ? OR category LIKE ? OR author LIKE ? OR short_description LIKE ? OR description LIKE ?)");
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

    const countRes = await query(`SELECT COUNT(*) as total FROM blogs ${whereSql}`, params);
    const total = countRes[0]?.total || 0;

    const rows = await query(
      `SELECT * FROM blogs ${whereSql} ORDER BY sequence ASC, id DESC LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    const translatedRows = await overlayEntityTranslations("blogs", rows, lang, TRANSLATABLE_FIELDS);

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

  const rows = await query(`SELECT * FROM blogs ${whereSql} ORDER BY sequence ASC, id DESC`, params);
  return overlayEntityTranslations("blogs", rows, lang, TRANSLATABLE_FIELDS);
}

async function getBlogById(id, lang = "en") {
  await ensureBlogsTable();
  const rows = await query("SELECT * FROM blogs WHERE id = ?", [id]);
  if (!rows.length) throw new AppError("Blog not found", 404);
  return overlayEntityTranslations("blogs", rows[0], lang, TRANSLATABLE_FIELDS);
}

async function createBlog(data) {
  await ensureBlogsTable();
  const {
    translations,
    title,
    category = "",
    author = "",
    publish_date = null,
    read_time = "",
    short_description = "",
    description = "",
    image_url,
    image_alt = "",
    status = "active",
  } = data;

  let sequence = data.sequence;
  if (sequence === undefined || sequence === null || sequence === 0) {
    sequence = await getNextSequence("blogs");
  }

  let savedImage = image_url;
  if (image_url && image_url.startsWith("data:")) {
    savedImage = await uploadBase64File(image_url, "blogs");
  }

  const result = await query(
    `INSERT INTO blogs (title, category, author, publish_date, read_time, short_description, description, image_url, image_alt, sequence, status, meta_title, meta_description)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      title ? title.trim() : "",
      category ? category.trim() : null,
      author ? author.trim() : null,
      publish_date || null,
      read_time ? read_time.trim() : null,
      short_description ? short_description.trim() : null,
      description ? description.trim() : null,
      savedImage || null,
      image_alt ? image_alt.trim() : (title ? title.trim() : null),
      sequence,
      status,
      seoValue(data.meta_title),
      seoValue(data.meta_description),
    ]
  );

  if (translations) {
    await saveEntityTranslations("blogs", result.insertId, translations);
  }

  return getBlogById(result.insertId);
}

async function updateBlog(id, data) {
  await ensureBlogsTable();
  const prev = await getBlogById(id);
  const {
    translations,
    title,
    category = "",
    author = "",
    publish_date = null,
    read_time = "",
    short_description = "",
    description = "",
    image_url,
    image_alt = "",
    status = "active",
  } = data;
  const sequence = data.sequence !== undefined && data.sequence !== null ? Number(data.sequence) : prev.sequence;

  let savedImage = image_url !== undefined ? image_url : prev.image_url;
  if (image_url && image_url.startsWith("data:")) {
    savedImage = await uploadBase64File(image_url, "blogs");
    if (prev.image_url && prev.image_url.startsWith("/uploads/")) {
      try { deleteStoredFile(prev.image_url); } catch (e) { }
    }
  }

  await query(
    `UPDATE blogs
     SET title = ?, category = ?, author = ?, publish_date = ?, read_time = ?, short_description = ?, description = ?, image_url = ?, image_alt = ?, sequence = ?, status = ?, meta_title = ?, meta_description = ?
     WHERE id = ?`,
    [
      title !== undefined ? title.trim() : prev.title,
      category !== undefined ? (category ? category.trim() : null) : prev.category,
      author !== undefined ? (author ? author.trim() : null) : prev.author,
      publish_date !== undefined ? (publish_date || null) : prev.publish_date,
      read_time !== undefined ? (read_time ? read_time.trim() : null) : prev.read_time,
      short_description !== undefined ? (short_description ? short_description.trim() : null) : prev.short_description,
      description !== undefined ? (description ? description.trim() : null) : prev.description,
      savedImage,
      image_alt !== undefined ? (image_alt ? image_alt.trim() : null) : prev.image_alt,
      sequence,
      status || prev.status,
      seoValue(data.meta_title, prev.meta_title),
      seoValue(data.meta_description, prev.meta_description),
      id,
    ]
  );

  if (translations) {
    await saveEntityTranslations("blogs", id, translations);
  }

  return getBlogById(id);
}

async function deleteBlog(id) {
  await ensureBlogsTable();
  const blog = await getBlogById(id);
  if (blog.image_url && blog.image_url.startsWith("/uploads/")) {
    try { deleteStoredFile(blog.image_url); } catch (e) { }
  }

  await query("DELETE FROM blogs WHERE id = ?", [id]);
  await deleteEntityTranslations("blogs", id);
  await resequenceTable("blogs");
  return { id: Number(id), deleted: true };
}

async function toggleBlogStatus(id) {
  await ensureBlogsTable();
  const blog = await getBlogById(id);
  const nextStatus = blog.status === "active" ? "inactive" : "active";
  await query("UPDATE blogs SET status = ? WHERE id = ?", [nextStatus, id]);
  return { ...blog, status: nextStatus };
}

module.exports = {
  getAllBlogs,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog,
  toggleBlogStatus,
};
