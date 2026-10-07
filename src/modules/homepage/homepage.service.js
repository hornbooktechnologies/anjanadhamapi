const { query } = require("../../config/database");
const AppError = require("../../utils/AppError");
const { uploadBase64File, deleteStoredFile } = require("../../utils/fileUpload");
const { getNextSequence } = require("../../utils/sequence");
const { overlayEntityTranslations } = require("../translations/translations.service");

let ensureWhyChooseCardsSchemaPromise = null;

async function ensureWhyChooseCardsSchema() {
  if (!ensureWhyChooseCardsSchemaPromise) {
    ensureWhyChooseCardsSchemaPromise = (async () => {
      const columns = await query(
        `SELECT COLUMN_NAME
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'homepage_whychoose_cards'
           AND COLUMN_NAME = 'cover_image_url'`
      );

      if (!columns.length) {
        await query(
          "ALTER TABLE homepage_whychoose_cards ADD COLUMN cover_image_url TEXT NULL AFTER file_url"
        );
      }

      const altColumns = await query(
        `SELECT COLUMN_NAME
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'homepage_whychoose_cards'
           AND COLUMN_NAME = 'cover_image_alt'`
      );

      if (!altColumns.length) {
        await query(
          "ALTER TABLE homepage_whychoose_cards ADD COLUMN cover_image_alt VARCHAR(255) NULL AFTER cover_image_url"
        );
      }
    })().catch((error) => {
      ensureWhyChooseCardsSchemaPromise = null;
      throw error;
    });
  }

  return ensureWhyChooseCardsSchemaPromise;
}

let ensureHomepageStatsSchemaPromise = null;
async function ensureHomepageStatsSchema() {
  if (!ensureHomepageStatsSchemaPromise) {
    ensureHomepageStatsSchemaPromise = (async () => {
      const descColumns = await query(
        `SELECT COLUMN_NAME
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'homepage_stats'
           AND COLUMN_NAME = 'description'`
      );

      if (!descColumns.length) {
        await query(
          "ALTER TABLE homepage_stats ADD COLUMN description TEXT NULL AFTER title"
        );
      }

      await query(
        "ALTER TABLE homepage_stats MODIFY COLUMN icon_url TEXT NULL"
      );
    })().catch((error) => {
      ensureHomepageStatsSchemaPromise = null;
      throw error;
    });
  }

  return ensureHomepageStatsSchemaPromise;
}

// ==========================================
// 1. Stats / Value Strip
// ==========================================
async function getAllStats(filters = {}) {
  await ensureHomepageStatsSchema();
  const params = [];
  let whereClause = "";

  if (["active", "inactive"].includes(filters.status)) {
    whereClause = " WHERE status = ?";
    params.push(filters.status);
  }

  const rows = await query(
    `SELECT * FROM homepage_stats${whereClause} ORDER BY sequence ASC, id DESC`,
    params
  );
  return overlayEntityTranslations("homepage_stats", rows, filters.lang, ["title", "description", "value_text"]);
}

async function getStatById(id) {
  await ensureHomepageStatsSchema();
  const rows = await query("SELECT * FROM homepage_stats WHERE id = ?", [id]);
  if (!rows.length) throw new AppError("Stat not found", 404);
  return rows[0];
}

async function createStat(data) {
  await ensureHomepageStatsSchema();
  const { title, description = "", icon_url = null, icon_alt = null, value_text, status = "active" } = data;
  let sequence = data.sequence;
  if (sequence === undefined || sequence === null || sequence === 0) {
    sequence = await getNextSequence("homepage_stats");
  }
  let savedIcon = icon_url;
  if (icon_url && icon_url.startsWith("data:")) {
    savedIcon = await uploadBase64File(icon_url, "homepage/stats");
  }
  const result = await query(
    "INSERT INTO homepage_stats (title, description, icon_url, icon_alt, value_text, sequence, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [title ? title.trim() : "", description ? description.trim() : null, savedIcon || null, icon_alt || null, value_text ? value_text.trim() : "", sequence, status]
  );
  return { id: result.insertId, title, description, icon_url: savedIcon, icon_alt, value_text, sequence, status };
}

async function updateStat(id, data) {
  await ensureHomepageStatsSchema();
  const prev = await getStatById(id);
  const { title, description = "", icon_url = null, icon_alt = null, value_text, status = "active" } = data;
  const sequence = data.sequence !== undefined && data.sequence !== null ? Number(data.sequence) : prev.sequence;
  let savedIcon = icon_url;
  if (icon_url && icon_url.startsWith("data:")) {
    savedIcon = await uploadBase64File(icon_url, "homepage/stats");
    if (prev.icon_url && prev.icon_url.startsWith("/uploads/")) {
      try { deleteStoredFile(prev.icon_url); } catch (e) { /* ignore */ }
    }
  }
  await query(
    "UPDATE homepage_stats SET title=?, description=?, icon_url=?, icon_alt=?, value_text=?, sequence=?, status=? WHERE id=?",
    [title ? title.trim() : "", description ? description.trim() : null, savedIcon || null, icon_alt || null, value_text ? value_text.trim() : "", sequence, status, id]
  );
  return { id: Number(id), title, description, icon_url: savedIcon, icon_alt, value_text, sequence, status };
}

async function deleteStat(id) {
  await ensureHomepageStatsSchema();
  const stat = await getStatById(id);
  if (stat.icon_url && stat.icon_url.startsWith("/uploads/")) {
    try { deleteStoredFile(stat.icon_url); } catch (e) { /* ignore */ }
  }
  await query("DELETE FROM homepage_stats WHERE id = ?", [id]);
}

// ==========================================
// 2. Process Section
// ==========================================
async function getProcessSection() {
  const rows = await query("SELECT * FROM homepage_process_section LIMIT 1");
  const steps = await query("SELECT * FROM homepage_process_steps ORDER BY sequence ASC, id DESC");
  return {
    section: rows[0] || { section_title: "", section_description: "" },
    steps,
  };
}

async function updateProcessSection(data) {
  const { section_title, section_description } = data;
  const existing = await query("SELECT id FROM homepage_process_section LIMIT 1");
  if (existing.length) {
    await query(
      "UPDATE homepage_process_section SET section_title=?, section_description=? WHERE id=?",
      [section_title, section_description, existing[0].id]
    );
  } else {
    await query(
      "INSERT INTO homepage_process_section (section_title, section_description) VALUES (?, ?)",
      [section_title, section_description]
    );
  }
}

async function getAllProcessSteps() {
  return await query("SELECT * FROM homepage_process_steps ORDER BY sequence ASC, id DESC");
}

async function getProcessStepById(id) {
  const rows = await query("SELECT * FROM homepage_process_steps WHERE id = ?", [id]);
  if (!rows.length) throw new AppError("Process step not found", 404);
  return rows[0];
}

async function getActiveProcessStepCount(excludeId = null) {
  const params = [];
  let sql = "SELECT COUNT(*) AS count FROM homepage_process_steps WHERE status = 'active'";

  if (excludeId) {
    sql += " AND id != ?";
    params.push(excludeId);
  }

  const rows = await query(sql, params);
  return Number(rows[0]?.count || 0);
}

async function createProcessStep(data) {
  const { step_title, step_description, file_url, alt_text, status = "active" } = data;
  const sequence = await getNextSequence("homepage_process_steps");
  if (status === "inactive" && (await getActiveProcessStepCount()) === 0) {
    throw new AppError("At least one process step must remain active.", 400);
  }

  let savedFile = file_url;
  if (file_url && file_url.startsWith("data:")) {
    savedFile = await uploadBase64File(file_url, "homepage/process");
  }
  const result = await query(
    "INSERT INTO homepage_process_steps (step_title, step_description, file_url, alt_text, sequence, status) VALUES (?, ?, ?, ?, ?, ?)",
    [step_title, step_description, savedFile, alt_text, sequence, status]
  );
  return { id: result.insertId, step_title, step_description, file_url: savedFile, alt_text, sequence, status };
}

async function updateProcessStep(id, data) {
  const prev = await getProcessStepById(id);
  const { step_title, step_description, file_url, alt_text, sequence, status } = data;
  if (status === "inactive" && (await getActiveProcessStepCount(id)) === 0) {
    throw new AppError("At least one process step must remain active.", 400);
  }

  let savedFile = file_url;
  if (file_url && file_url.startsWith("data:")) {
    savedFile = await uploadBase64File(file_url, "homepage/process");
    if (prev.file_url && prev.file_url.startsWith("/uploads/")) {
      try { require("../../utils/fileUpload").deleteStoredFile(prev.file_url); } catch (e) { }
    }
  }
  await query(
    "UPDATE homepage_process_steps SET step_title=?, step_description=?, file_url=?, alt_text=?, sequence=?, status=? WHERE id=?",
    [step_title, step_description, savedFile, alt_text, sequence, status, id]
  );
  return { id, step_title, step_description, file_url: savedFile, alt_text, sequence, status };
}

async function deleteProcessStep(id) {
  const step = await getProcessStepById(id);
  const totalRows = await query("SELECT COUNT(*) AS count FROM homepage_process_steps");
  if (Number(totalRows[0]?.count || 0) <= 1) {
    throw new AppError("At least one process step is required.", 400);
  }
  if ((await getActiveProcessStepCount(id)) === 0) {
    throw new AppError("At least one process step must remain active.", 400);
  }

  await query("DELETE FROM homepage_process_steps WHERE id = ?", [id]);
}

// ==========================================
// 3. Why Choose Section
// ==========================================
async function getWhyChooseSection() {
  await ensureWhyChooseCardsSchema();
  const rows = await query("SELECT * FROM homepage_whychoose_section LIMIT 1");
  const cards = await query("SELECT * FROM homepage_whychoose_cards ORDER BY sequence ASC, id DESC");
  return {
    section: rows[0] || { section_title: "", section_description: "" },
    cards,
  };
}

async function updateWhyChooseSection(data) {
  const { section_title, section_description } = data;
  const existing = await query("SELECT id FROM homepage_whychoose_section LIMIT 1");
  if (existing.length) {
    await query(
      "UPDATE homepage_whychoose_section SET section_title=?, section_description=? WHERE id=?",
      [section_title, section_description, existing[0].id]
    );
  } else {
    await query(
      "INSERT INTO homepage_whychoose_section (section_title, section_description) VALUES (?, ?)",
      [section_title, section_description]
    );
  }
}

async function getAllWhyChooseCards() {
  await ensureWhyChooseCardsSchema();
  return await query("SELECT * FROM homepage_whychoose_cards ORDER BY sequence ASC, id DESC");
}

async function getWhyChooseCardById(id) {
  await ensureWhyChooseCardsSchema();
  const rows = await query("SELECT * FROM homepage_whychoose_cards WHERE id = ?", [id]);
  if (!rows.length) throw new AppError("Card not found", 404);
  return rows[0];
}

async function createWhyChooseCard(data) {
  await ensureWhyChooseCardsSchema();
  const { card_title, card_description, file_url, cover_image_url, cover_image_alt, alt_text, status = "active" } = data;
  const sequence = await getNextSequence("homepage_whychoose_cards");
  let savedFile = file_url;
  let savedCoverImage = cover_image_url;
  if (file_url && file_url.startsWith("data:")) {
    savedFile = await uploadBase64File(file_url, "homepage/whychoose");
  }
  if (cover_image_url && cover_image_url.startsWith("data:")) {
    savedCoverImage = await uploadBase64File(cover_image_url, "homepage/whychoose");
  }
  const result = await query(
    "INSERT INTO homepage_whychoose_cards (card_title, card_description, file_url, cover_image_url, cover_image_alt, alt_text, sequence, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [card_title, card_description, savedFile, savedCoverImage, cover_image_alt, alt_text, sequence, status]
  );
  return { id: result.insertId, card_title, card_description, file_url: savedFile, cover_image_url: savedCoverImage, cover_image_alt, alt_text, sequence, status };
}

async function updateWhyChooseCard(id, data) {
  await ensureWhyChooseCardsSchema();
  const prev = await getWhyChooseCardById(id);
  const { card_title, card_description, file_url, cover_image_url, cover_image_alt, alt_text, sequence, status } = data;
  let savedFile = file_url;
  let savedCoverImage = cover_image_url;
  if (file_url && file_url.startsWith("data:")) {
    savedFile = await uploadBase64File(file_url, "homepage/whychoose");
    if (prev.file_url && prev.file_url.startsWith("/uploads/")) {
      try { require("../../utils/fileUpload").deleteStoredFile(prev.file_url); } catch (e) { }
    }
  }
  if (cover_image_url && cover_image_url.startsWith("data:")) {
    savedCoverImage = await uploadBase64File(cover_image_url, "homepage/whychoose");
    if (prev.cover_image_url && prev.cover_image_url.startsWith("/uploads/")) {
      try { require("../../utils/fileUpload").deleteStoredFile(prev.cover_image_url); } catch (e) { }
    }
  }
  await query(
    "UPDATE homepage_whychoose_cards SET card_title=?, card_description=?, file_url=?, cover_image_url=?, cover_image_alt=?, alt_text=?, sequence=?, status=? WHERE id=?",
    [card_title, card_description, savedFile, savedCoverImage, cover_image_alt, alt_text, sequence, status, id]
  );
  return { id, card_title, card_description, file_url: savedFile, cover_image_url: savedCoverImage, cover_image_alt, alt_text, sequence, status };
}

async function deleteWhyChooseCard(id) {
  await ensureWhyChooseCardsSchema();
  const card = await getWhyChooseCardById(id);
  if (card.file_url?.startsWith("/uploads/")) {
    try { deleteStoredFile(card.file_url); } catch (e) { }
  }
  if (card.cover_image_url?.startsWith("/uploads/")) {
    try { deleteStoredFile(card.cover_image_url); } catch (e) { }
  }
  await query("DELETE FROM homepage_whychoose_cards WHERE id = ?", [id]);
}

// ==========================================
// 4. Homepage Banners
// ==========================================
let bannersTableEnsured = false;
async function ensureHomepageBannersTable() {
  if (bannersTableEnsured) return;

  await query(
    `CREATE TABLE IF NOT EXISTS homepage_banners (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NULL,
      file_url TEXT NOT NULL,
      alt_text VARCHAR(255) NULL,
      cta_text VARCHAR(100) NULL,
      cta_link VARCHAR(255) NULL,
      sequence INT DEFAULT 0,
      status ENUM('active','inactive') DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );

  try {
    const defaultPermissions = [
      { name: "homepage.banner.view", module: "homepage" },
      { name: "homepage.banner.create", module: "homepage" },
      { name: "homepage.banner.update", module: "homepage" },
      { name: "homepage.banner.delete", module: "homepage" },
      { name: "homepage.banners.view", module: "homepage" },
      { name: "homepage.banners.create", module: "homepage" },
      { name: "homepage.banners.update", module: "homepage" },
      { name: "homepage.banners.delete", module: "homepage" },
    ];
    for (const perm of defaultPermissions) {
      let permId;
      const existing = await query("SELECT id FROM permissions WHERE name = ?", [perm.name]);
      if (existing.length === 0) {
        const insertRes = await query("INSERT INTO permissions (name, module) VALUES (?, ?)", [perm.name, perm.module]);
        permId = insertRes.insertId;
      } else {
        permId = existing[0].id;
      }

      if (permId) {
        // Assign to Super Admin (1) and Builder (2)
        const roles = await query("SELECT id FROM roles WHERE id IN (1, 2)");
        for (const r of roles) {
          const hasRp = await query("SELECT id FROM role_permissions WHERE role_id = ? AND permission_id = ?", [r.id, permId]);
          if (hasRp.length === 0) {
            await query("INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)", [r.id, permId]);
          }
        }
      }
    }
  } catch (permError) {
    console.error("Warning: Failed to ensure homepage_banners permissions:", permError.message);
  }

  bannersTableEnsured = true;
}

async function getAllHomepageBanners({ search = "", status = "", page, limit } = {}) {
  await ensureHomepageBannersTable();

  const conditions = [];
  const queryParams = [];

  if (search && search.trim()) {
    conditions.push("(title LIKE ? OR alt_text LIKE ? OR cta_text LIKE ?)");
    const searchTerm = `%${search.trim()}%`;
    queryParams.push(searchTerm, searchTerm, searchTerm);
  }

  if (status && status.trim()) {
    conditions.push("status = ?");
    queryParams.push(status.trim());
  }

  const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  if (page && limit) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const offset = (pageNum - 1) * limitNum;

    const countRes = await query(`SELECT COUNT(*) as total FROM homepage_banners ${whereSql}`, queryParams);
    const total = Number(countRes[0]?.total || 0);

    const rows = await query(
      `SELECT * FROM homepage_banners ${whereSql} ORDER BY sequence ASC, id DESC LIMIT ? OFFSET ?`,
      [...queryParams, limitNum, offset]
    );

    return {
      data: rows,
      pagination: {
        total,
        per_page: limitNum,
        current_page: pageNum,
        last_page: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  return await query(`SELECT * FROM homepage_banners ${whereSql} ORDER BY sequence ASC, id DESC`, queryParams);
}

async function getHomepageBannerById(id) {
  await ensureHomepageBannersTable();
  const rows = await query("SELECT * FROM homepage_banners WHERE id = ?", [id]);
  if (!rows.length) throw new AppError("Homepage banner not found", 404);
  return rows[0];
}

async function createHomepageBanner(data) {
  await ensureHomepageBannersTable();
  const { title = "", file_url, alt_text = "", cta_text = "", cta_link = "", status = "active" } = data;
  let sequence = data.sequence;
  if (sequence === undefined || sequence === null || sequence === 0) {
    sequence = await getNextSequence("homepage_banners");
  }

  let savedFile = file_url;
  if (file_url && file_url.startsWith("data:")) {
    savedFile = await uploadBase64File(file_url, "homepage/banners");
  }

  const result = await query(
    `INSERT INTO homepage_banners (title, file_url, alt_text, cta_text, cta_link, sequence, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [title ? title.trim() : null, savedFile, alt_text ? alt_text.trim() : null, cta_text ? cta_text.trim() : null, cta_link ? cta_link.trim() : null, sequence, status]
  );

  return {
    id: result.insertId,
    title: title ? title.trim() : null,
    file_url: savedFile,
    alt_text: alt_text ? alt_text.trim() : null,
    cta_text: cta_text ? cta_text.trim() : null,
    cta_link: cta_link ? cta_link.trim() : null,
    sequence,
    status,
  };
}

async function updateHomepageBanner(id, data) {
  await ensureHomepageBannersTable();
  const prev = await getHomepageBannerById(id);
  const { title = "", file_url, alt_text = "", cta_text = "", cta_link = "", status = "active" } = data;
  const sequence = data.sequence !== undefined && data.sequence !== null ? Number(data.sequence) : prev.sequence;

  let savedFile = file_url;
  if (file_url && file_url.startsWith("data:")) {
    savedFile = await uploadBase64File(file_url, "homepage/banners");
    if (prev.file_url && prev.file_url.startsWith("/uploads/")) {
      try { deleteStoredFile(prev.file_url); } catch (e) { }
    }
  }

  await query(
    `UPDATE homepage_banners
     SET title = ?, file_url = ?, alt_text = ?, cta_text = ?, cta_link = ?, sequence = ?, status = ?
     WHERE id = ?`,
    [title ? title.trim() : null, savedFile, alt_text ? alt_text.trim() : null, cta_text ? cta_text.trim() : null, cta_link ? cta_link.trim() : null, sequence, status, id]
  );

  return {
    id: Number(id),
    title: title ? title.trim() : null,
    file_url: savedFile,
    alt_text: alt_text ? alt_text.trim() : null,
    cta_text: cta_text ? cta_text.trim() : null,
    cta_link: cta_link ? cta_link.trim() : null,
    sequence,
    status,
  };
}

async function deleteHomepageBanner(id) {
  await ensureHomepageBannersTable();
  const banner = await getHomepageBannerById(id);
  if (banner.file_url && banner.file_url.startsWith("/uploads/")) {
    try { deleteStoredFile(banner.file_url); } catch (e) { }
  }
  await query("DELETE FROM homepage_banners WHERE id = ?", [id]);
}

async function toggleHomepageBannerStatus(id) {
  await ensureHomepageBannersTable();
  const banner = await getHomepageBannerById(id);
  const nextStatus = banner.status === "active" ? "inactive" : "active";
  await query("UPDATE homepage_banners SET status = ? WHERE id = ?", [nextStatus, id]);
  return { ...banner, status: nextStatus };
}

module.exports = {
  getAllStats, getStatById, createStat, updateStat, deleteStat,
  getProcessSection, updateProcessSection,
  getAllProcessSteps, getProcessStepById, createProcessStep, updateProcessStep, deleteProcessStep,
  getWhyChooseSection, updateWhyChooseSection,
  getAllWhyChooseCards, getWhyChooseCardById, createWhyChooseCard, updateWhyChooseCard, deleteWhyChooseCard,
  getAllHomepageBanners, getHomepageBannerById, createHomepageBanner, updateHomepageBanner, deleteHomepageBanner, toggleHomepageBannerStatus,
};
