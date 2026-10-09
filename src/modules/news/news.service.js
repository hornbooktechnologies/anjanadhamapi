const { query } = require("../../config/database");
const AppError = require("../../utils/AppError");
const { deleteStoredFile } = require("../../utils/fileUpload");
const { getNextSequence } = require("../../utils/sequence");
const { ensureAnnouncementSchedule, resolvePublicationSchedule, utcNowSql, scheduleSql, scheduleFields } = require("./news.schedule");

// ==========================================
// 1. CATEGORY TABS SERVICE
// ==========================================

async function createCategory(data) {
  const sequence = await getNextSequence("news_categories");
  const result = await query(
    `INSERT INTO news_categories
     (category_title, sequence, status)
     VALUES (?, ?, ?)`,
    [
      data.category_title,
      sequence,
      data.status || "active",
    ]
  );
  return { id: result.insertId, ...data, sequence };
}

async function getCategories(filters = {}) {
  let sql = "SELECT * FROM news_categories WHERE 1=1";
  const params = [];

  if (filters.category_title) {
    sql += " AND category_title LIKE ?";
    params.push(`%${filters.category_title}%`);
  }

  if (filters.status) {
    sql += " AND status = ?";
    params.push(filters.status);
  }

  // Sorting
  const sortBy = ["sequence", "id", "category_title", "status"].includes(filters.sortBy) ? filters.sortBy : "sequence";
  const sortOrder = filters.sortOrder === "desc" ? "DESC" : "ASC";
  sql += ` ORDER BY ${sortBy} ${sortOrder}`;

  // If no pagination is passed (e.g. for content form category selection dropdowns), return all rows
  if (filters.limit === "all") {
    const data = await query(sql, params);
    return { data };
  }

  // Pagination
  let limit = parseInt(filters.limit) || 10;
  let page = parseInt(filters.page) || 1;
  let offset = (page - 1) * limit;

  const totalResult = await query(
    sql.replace("SELECT *", "SELECT COUNT(*) as total"),
    params
  );
  const total = totalResult[0].total;

  sql += " LIMIT ? OFFSET ?";
  params.push(limit, offset);

  const data = await query(sql, params);
  const last_page = Math.ceil(total / limit) || 1;

  return {
    data,
    pagination: {
      total,
      per_page: limit,
      current_page: page,
      last_page,
    },
  };
}

async function getCategoryById(id) {
  const result = await query("SELECT * FROM news_categories WHERE id = ?", [id]);
  if (result.length === 0) return null;
  return result[0];
}

async function getCategoryArticleCount(categoryId) {
  const rows = await query(
    "SELECT COUNT(*) AS total FROM news_content WHERE category_id = ?",
    [categoryId]
  );
  return Number(rows[0]?.total || 0);
}

async function ensureCategoryHasNoArticles(categoryId, action) {
  const articleCount = await getCategoryArticleCount(categoryId);
  if (articleCount > 0) {
    const articleLabel = articleCount === 1 ? "article" : "articles";
    throw new AppError(
      `This category cannot be ${action} because it contains ${articleCount} ${articleLabel}. Move or delete the ${articleLabel} first.`,
      409
    );
  }
}

async function ensureArticleCategoryIsActive(categoryId, existingCategoryId = null) {
  const category = await getCategoryById(categoryId);
  if (!category) {
    throw new AppError("Selected category not found", 400);
  }
  if (
    category.status !== "active" &&
    Number(category.id) !== Number(existingCategoryId)
  ) {
    throw new AppError("Please select an active category for this article", 400);
  }
}

async function updateCategory(id, data) {
  const cat = await getCategoryById(id);
  if (!cat) {
    throw new AppError("Category not found", 404);
  }

  const nextStatus = data.status || "active";
  if (cat.status === "active" && nextStatus === "inactive") {
    await ensureCategoryHasNoArticles(id, "deactivated");
  }

  await query(
    `UPDATE news_categories SET
     category_title = ?, sequence = ?, status = ?
     WHERE id = ?`,
    [
      data.category_title,
      data.sequence ?? 0,
      nextStatus,
      id,
    ]
  );
  return { id, ...data };
}

async function deleteCategory(id) {
  const cat = await getCategoryById(id);
  if (!cat) {
    throw new AppError("Category not found", 404);
  }
  await ensureCategoryHasNoArticles(id, "deleted");
  await query("DELETE FROM news_categories WHERE id = ?", [id]);
}

async function toggleCategoryStatus(id) {
  const cat = await getCategoryById(id);
  if (!cat) {
    throw new AppError("Category not found", 404);
  }

  const newStatus = cat.status === "active" ? "inactive" : "active";
  if (newStatus === "inactive") {
    await ensureCategoryHasNoArticles(id, "deactivated");
  }
  await query("UPDATE news_categories SET status = ? WHERE id = ?", [newStatus, id]);
  return { id, status: newStatus };
}

// ==========================================
// 2. NEWS & UPDATES SERVICE
// ==========================================

async function validateFeaturedListingChoice(data, excludedId = null) {
  if (!data.featured_listing) return;

  if (data.publish_status !== "published") {
    throw new AppError("The featured top article must be published", 400);
  }

  let sql = "SELECT id, title FROM news_content WHERE featured_listing = 1";
  const params = [];
  if (excludedId !== null) {
    sql += " AND id <> ?";
    params.push(excludedId);
  }
  sql += " LIMIT 1";

  const existing = await query(sql, params);
  if (existing.length) {
    throw new AppError(
      `Only one featured top article is allowed. Uncheck \"${existing[0].title}\" first.`,
      409
    );
  }
}

async function createNews(data) {
  await ensureAnnouncementSchedule();
  await ensureArticleCategoryIsActive(data.category_id);
  await validateFeaturedListingChoice(data);
  const schedule = resolvePublicationSchedule(data);
  const sequence = await getNextSequence("news_content");
  const result = await query(
    `INSERT INTO news_content 
     (category_id, title, date, publish_at, short_description, image_url, image_alt, logo_url, logo_alt, external_url, featured_homepage, featured_listing, publish_status, sequence)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.category_id,
      data.title,
      schedule.date,
      schedule.publish_at,
      data.short_description,
      data.image_url,
      data.image_alt,
      data.logo_url || null,
      data.logo_alt || null,
      data.external_url || null,
      data.featured_homepage ?? 0,
      data.featured_listing ? 1 : null,
      data.publish_status || "draft",
      sequence,
    ]
  );
  return getNewsById(result.insertId);
}

async function getNewsContent(filters = {}) {
  await ensureAnnouncementSchedule();
  const now = utcNowSql();
  let sql = `
    SELECT n.*, DATE_FORMAT(n.date, '%Y-%m-%d') AS date, ${scheduleFields}, CASE WHEN n.publish_status = 'draft' THEN 'draft' WHEN ${scheduleSql} > ? THEN 'scheduled' ELSE 'published' END AS publication_state, c.category_title
    FROM news_content n
    INNER JOIN news_categories c ON n.category_id = c.id 
    WHERE 1=1
  `;
  const params = [];

  if (filters.title) {
    sql += " AND n.title LIKE ?";
    params.push(`%${filters.title}%`);
  }

  if (filters.category_id) {
    sql += " AND n.category_id = ?";
    params.push(filters.category_id);
  }

  const scheduleFilter = ["published", "scheduled"].includes(filters.publish_status)
    ? ` AND n.publish_status = 'published' AND ${scheduleSql} ${filters.publish_status === "scheduled" ? ">" : "<="} ?` : "";
  if (scheduleFilter) {
    sql += scheduleFilter;
    params.push(now);
  } else if (filters.publish_status) {
    sql += " AND n.publish_status = ?";
    params.push(filters.publish_status);
  }

  if (filters.category_status) {
    sql += " AND c.status = ?";
    params.push(filters.category_status);
  }

  if (filters.startDate) {
    sql += " AND n.date >= ?";
    params.push(filters.startDate);
  }

  if (filters.endDate) {
    sql += " AND n.date <= ?";
    params.push(filters.endDate);
  }

  // Sorting
  const sortColumns = { sequence: "n.sequence", title: "n.title", date: scheduleSql, publish_at: scheduleSql, id: "n.id" };
  const sortBy = sortColumns[filters.sortBy] || "n.sequence";
  const sortOrder = filters.sortOrder === "desc" ? "DESC" : "ASC";
  sql += ` ORDER BY ${sortBy} ${sortOrder}`;

  // Pagination
  let limit = parseInt(filters.limit) || 10;
  let page = parseInt(filters.page) || 1;
  let offset = (page - 1) * limit;

  const countSql = `
    SELECT COUNT(*) as total 
    FROM news_content n 
    INNER JOIN news_categories c ON n.category_id = c.id 
    WHERE 1=1
    ${filters.title ? " AND n.title LIKE ?" : ""}
    ${filters.category_id ? " AND n.category_id = ?" : ""}
    ${scheduleFilter || (filters.publish_status ? " AND n.publish_status = ?" : "")}
    ${filters.category_status ? " AND c.status = ?" : ""}
    ${filters.startDate ? " AND n.date >= ?" : ""}
    ${filters.endDate ? " AND n.date <= ?" : ""}
  `;

  const totalResult = await query(countSql, params);
  const total = totalResult[0].total;

  sql += " LIMIT ? OFFSET ?";
  params.push(limit, offset);

  const data = await query(sql, [now, ...params]);
  const last_page = Math.ceil(total / limit) || 1;

  return {
    data,
    pagination: {
      total,
      per_page: limit,
      current_page: page,
      last_page,
    },
  };
}

async function getPublicAnnouncements(filters = {}) {
  await ensureAnnouncementSchedule();
  const limit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 20));
  const page = Math.max(1, parseInt(filters.page, 10) || 1);
  const now = utcNowSql();
  const where = `FROM news_content n INNER JOIN news_categories c ON n.category_id = c.id WHERE n.publish_status = 'published' AND c.status = 'active' AND ${scheduleSql} <= ?`;
  const totals = await query(`SELECT COUNT(*) AS total ${where}`, [now]);
  const total = Number(totals[0]?.total || 0);
  const data = await query(
    `SELECT n.id, n.title, DATE_FORMAT(n.date, '%Y-%m-%d') AS date, ${scheduleFields}, n.short_description, n.image_url, n.image_alt, n.external_url, c.category_title ${where} ORDER BY ${scheduleSql} DESC, n.id DESC LIMIT ? OFFSET ?`,
    [now, limit, (page - 1) * limit]
  );
  return { data, pagination: { total, per_page: limit, current_page: page, last_page: Math.max(1, Math.ceil(total / limit)) } };
}

async function getNewsById(id) {
  await ensureAnnouncementSchedule();
  const result = await query(
    `SELECT n.*, DATE_FORMAT(n.date, '%Y-%m-%d') AS date, ${scheduleFields}, CASE WHEN n.publish_status = 'draft' THEN 'draft' WHEN ${scheduleSql} > ? THEN 'scheduled' ELSE 'published' END AS publication_state FROM news_content n WHERE n.id = ?`,
    [utcNowSql(), id]
  );
  if (result.length === 0) return null;
  return result[0];
}

async function updateNews(id, data) {
  const news = await getNewsById(id);
  if (!news) {
    throw new AppError("News article not found", 404);
  }

  await ensureArticleCategoryIsActive(data.category_id, news.category_id);
  await validateFeaturedListingChoice(data, id);
  const schedule = resolvePublicationSchedule(data, news);

  await query(
    `UPDATE news_content SET 
     category_id = ?, title = ?, date = ?, publish_at = ?, short_description = ?,
     image_url = ?, image_alt = ?, logo_url = ?, logo_alt = ?, external_url = ?, featured_homepage = ?, featured_listing = ?,
     publish_status = ?, sequence = ? 
     WHERE id = ?`,
    [
      data.category_id,
      data.title,
      schedule.date,
      schedule.publish_at,
      data.short_description,
      data.image_url,
      data.image_alt,
      data.logo_url || null,
      data.logo_alt || null,
      data.external_url || null,
      data.featured_homepage ?? 0,
      data.featured_listing ? 1 : null,
      data.publish_status || "draft",
      data.sequence ?? news.sequence,
      id,
    ]
  );
  return getNewsById(id);
}

async function deleteNews(id) {
  const news = await getNewsById(id);
  if (!news) {
    throw new AppError("News article not found", 404);
  }
  if (news.image_url?.startsWith("/uploads/")) {
    try {
      deleteStoredFile(news.image_url);
    } catch (error) {}
  }
  if (news.logo_url?.startsWith("/uploads/")) {
    try {
      deleteStoredFile(news.logo_url);
    } catch (error) {}
  }
  await query("DELETE FROM news_content WHERE id = ?", [id]);
}

async function toggleNewsPublish(id) {
  const news = await getNewsById(id);
  if (!news) {
    throw new AppError("News article not found", 404);
  }

  const newStatus = news.publish_status === "published" ? "draft" : "published";
  if (newStatus === "published") await ensureArticleCategoryIsActive(news.category_id);
  const schedule = newStatus === "published"
    ? resolvePublicationSchedule({ publish_status: "published", publish_immediately: true }, news)
    : { date: news.date, publish_at: news.publish_at.slice(0, 19).replace("T", " ") };
  await query(
    "UPDATE news_content SET publish_status = ?, date = ?, publish_at = ?, featured_listing = CASE WHEN ? = 'draft' THEN NULL ELSE featured_listing END WHERE id = ?",
    [newStatus, schedule.date, schedule.publish_at, newStatus, id]
  );
  return { id, publish_status: newStatus, featured_listing: newStatus === "draft" ? 0 : Number(news.featured_listing) };
}

module.exports = {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus,
  createNews,
  getNewsContent,
  getPublicAnnouncements,
  getNewsById,
  updateNews,
  deleteNews,
  toggleNewsPublish,
};
