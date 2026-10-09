const { query } = require("../../config/database");
const AppError = require("../../utils/AppError");
const { deleteStoredFile } = require("../../utils/fileUpload");
const { changeProfileWithCleanup } = require('../../utils/profileCleanup');
const { getNextSequence } = require("../../utils/sequence");
const { validateMemberGroup, ensureTeamGroups } = require('./team-groups.service');

async function hasTable(tableName) {
  const rows = await query(
    `SELECT COUNT(*) AS count FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [tableName]
  );
  return Number(rows[0]?.count || 0) > 0;
}

async function hasColumn(tableName, columnName) {
  const rows = await query(
    `SELECT COUNT(*) AS count FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );
  return Number(rows[0]?.count || 0) > 0;
}

async function getColumnType(tableName, columnName) {
  const rows = await query(
    `SELECT COLUMN_TYPE
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
     LIMIT 1`,
    [tableName, columnName]
  );
  return rows[0]?.COLUMN_TYPE || "";
}

// ==========================================
// TEAM MEMBERS SERVICE
// ==========================================

async function createMember(data) {
  data = { ...data, group_name: await validateMemberGroup(data.group_name), location: data.location?.trim() || null };
  const sequence = await getNextSequence("team_members", {
    group_name: data.group_name,
  });
  const result = await query(
    `INSERT INTO team_members 
     (group_name, name, designation, location, photo_url, photo_alt, linkedin_url, show_on_homepage, sequence, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.group_name,
      data.name,
      data.designation,
      data.location,
      data.photo_url,
      data.photo_alt,
      data.linkedin_url || null,
      data.show_on_homepage || 0,
      sequence,
      data.status || "active",
    ]
  );
  return { id: result.insertId, ...data, sequence };
}

async function getMembers(filters = {}) {
  await ensureTeamGroups();
  let sql = "SELECT * FROM team_members WHERE 1=1";
  const params = [];

  if (filters.name) {
    sql += " AND name LIKE ?";
    params.push(`%${filters.name}%`);
  }

  if (filters.group_name) {
    sql += " AND group_name = ?";
    params.push(filters.group_name);
  }

  if (filters.status) {
    sql += " AND status = ?";
    params.push(filters.status);
  }

  // Sorting
  const sortBy = filters.sortBy || "sequence";
  const sortOrder = filters.sortOrder === "desc" ? "DESC" : "ASC";
  sql += ` ORDER BY ${sortBy} ${sortOrder}`;

  // Pagination
  let limit = parseInt(filters.limit) || 10;
  let page = parseInt(filters.page) || 1;
  let offset = (page - 1) * limit;

  // Count total for pagination
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

async function getMemberById(id) {
  await ensureTeamGroups();
  const result = await query("SELECT * FROM team_members WHERE id = ?", [id]);
  if (result.length === 0) return null;
  return result[0];
}

async function updateMember(id, data) {
  const member = await getMemberById(id);
  if (!member) {
    throw new AppError("Team member not found", 404);
  }

  data = {
    ...data,
    group_name: await validateMemberGroup(data.group_name, member.group_name),
    location: data.location === undefined ? member.location || null : data.location?.trim() || null,
  };

  await changeProfileWithCleanup(
    `UPDATE team_members SET 
     group_name = ?, name = ?, designation = ?, location = ?, photo_url = ?, photo_alt = ?,
     linkedin_url = ?, show_on_homepage = ?, sequence = ?, status = ? 
     WHERE id = ?`,
    [
      data.group_name,
      data.name,
      data.designation,
      data.location,
      data.photo_url,
      data.photo_alt,
      data.linkedin_url === undefined ? member.linkedin_url || null : data.linkedin_url || null,
      data.show_on_homepage || 0,
      data.sequence || 0,
      data.status || "active",
      id,
    ],
    member.photo_url !== data.photo_url ? member.photo_url : null
  );

  return { id, ...data };
}

async function deleteMember(id) {
  const member = await getMemberById(id);
  if (!member) {
    throw new AppError("Team member not found", 404);
  }
  await changeProfileWithCleanup("DELETE FROM team_members WHERE id = ?", [id], member.photo_url);
}

async function toggleMemberStatus(id) {
  const member = await getMemberById(id);
  if (!member) {
    throw new AppError("Team member not found", 404);
  }

  const newStatus = member.status === "active" ? "inactive" : "active";
  await query("UPDATE team_members SET status = ? WHERE id = ?", [newStatus, id]);
  return { id, status: newStatus };
}

// ==========================================
// LIFE AT GDB SERVICE
// ==========================================

async function ensureLifeAtGdbTables() {
  if (!(await hasTable("team_life_section"))) {
    await query(
      `CREATE TABLE team_life_section (
        id INT AUTO_INCREMENT PRIMARY KEY,
        section_title VARCHAR(255) NULL,
        section_description TEXT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    );
  }

  if (!(await hasColumn("team_life_gallery", "slider_group"))) {
    await query("ALTER TABLE team_life_gallery ADD COLUMN slider_group TINYINT(1) NOT NULL DEFAULT 1 AFTER alt_text");
    await query(
      `UPDATE team_life_gallery
       SET slider_group = CASE WHEN MOD(sequence, 2) = 0 THEN 2 ELSE 1 END`
    );
  }
  const hasGalleryTitle = await hasColumn("team_life_gallery", "section_title");
  const hasGalleryDescription = await hasColumn("team_life_gallery", "description");

  if (hasGalleryTitle || hasGalleryDescription) {
    const existingSection = await query("SELECT id FROM team_life_section LIMIT 1");
    if (!existingSection.length && hasGalleryTitle && hasGalleryDescription) {
      const legacyRows = await query(
        `SELECT section_title, description
         FROM team_life_gallery
         WHERE section_title IS NOT NULL OR description IS NOT NULL
         ORDER BY sequence ASC, id ASC
         LIMIT 1`
      );
      if (legacyRows.length) {
        await query(
          "INSERT INTO team_life_section (section_title, section_description) VALUES (?, ?)",
          [legacyRows[0].section_title || null, legacyRows[0].description || null]
        );
      }
    }
    if (hasGalleryDescription) {
      await query("ALTER TABLE team_life_gallery DROP COLUMN description");
    }
    if (hasGalleryTitle) {
      await query("ALTER TABLE team_life_gallery DROP COLUMN section_title");
    }
  }

  if ((await getColumnType("team_life_gallery", "media_type")).includes("video")) {
    await query("UPDATE team_life_gallery SET media_type = 'image' WHERE media_type <> 'image'");
    await query("ALTER TABLE team_life_gallery MODIFY COLUMN media_type ENUM('image') NOT NULL DEFAULT 'image'");
  }
}

async function getLifeSection() {
  await ensureLifeAtGdbTables();
  const rows = await query("SELECT * FROM team_life_section LIMIT 1");

  if (rows.length) {
    return rows[0];
  }

  return {
    section_title: "Life at Anjanadham",
    section_description:
      "A community shaped by service, learning, teamwork, and shared responsibility.",
  };
}

async function updateLifeSection(data) {
  await ensureLifeAtGdbTables();
  const existing = await query("SELECT id FROM team_life_section LIMIT 1");
  if (existing.length) {
    await query(
      "UPDATE team_life_section SET section_title = ?, section_description = ? WHERE id = ?",
      [data.section_title || null, data.section_description || null, existing[0].id]
    );
  } else {
    await query(
      "INSERT INTO team_life_section (section_title, section_description) VALUES (?, ?)",
      [data.section_title || null, data.section_description || null]
    );
  }
  return getLifeSection();
}

async function createLifeItem(data) {
  await ensureLifeAtGdbTables();
  const sliderGroup = Number(data.slider_group) === 2 ? 2 : 1;
  const sequence = await getNextSequence("team_life_gallery", { slider_group: sliderGroup });
  const result = await query(
    `INSERT INTO team_life_gallery 
     (file_url, media_type, alt_text, slider_group, sequence, status) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      data.file_url,
      "image",
      data.alt_text,
      sliderGroup,
      sequence,
      data.status || "active",
    ]
  );
  return { id: result.insertId, ...data, sequence };
}

async function getLifeItems(filters = {}) {
  await ensureLifeAtGdbTables();
  let sql = "SELECT * FROM team_life_gallery WHERE 1=1";
  const params = [];

  if (filters.search) {
    sql += " AND alt_text LIKE ?";
    params.push(`%${filters.search}%`);
  }

  if (filters.slider_group) {
    sql += " AND slider_group = ?";
    params.push(Number(filters.slider_group) === 2 ? 2 : 1);
  }

  if (filters.status) {
    sql += " AND status = ?";
    params.push(filters.status);
  }

  // Sorting
  const sortBy = filters.sortBy || "sequence";
  const sortOrder = filters.sortOrder === "desc" ? "DESC" : "ASC";
  sql += ` ORDER BY ${sortBy} ${sortOrder}`;

  // Pagination
  let limit = parseInt(filters.limit) || 10;
  let page = parseInt(filters.page) || 1;
  let offset = (page - 1) * limit;

  // Count total for pagination
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

async function getLifeItemById(id) {
  await ensureLifeAtGdbTables();
  const result = await query("SELECT * FROM team_life_gallery WHERE id = ?", [id]);
  if (result.length === 0) return null;
  return result[0];
}

async function updateLifeItem(id, data) {
  await ensureLifeAtGdbTables();
  const item = await getLifeItemById(id);
  if (!item) {
    throw new AppError("Gallery item not found", 404);
  }
  const sliderGroup = Number(data.slider_group) === 2 ? 2 : 1;
  const sequence =
    Number(item.slider_group) === sliderGroup
      ? data.sequence || 0
      : await getNextSequence("team_life_gallery", { slider_group: sliderGroup });

  await query(
    `UPDATE team_life_gallery SET 
     file_url = ?, media_type = ?, alt_text = ?, slider_group = ?,
     sequence = ?, status = ? 
     WHERE id = ?`,
    [
      data.file_url,
      "image",
      data.alt_text,
      sliderGroup,
      sequence,
      data.status || "active",
      id,
    ]
  );

  return { id, ...data };
}

async function deleteLifeItem(id) {
  await ensureLifeAtGdbTables();
  const item = await getLifeItemById(id);
  if (!item) {
    throw new AppError("Gallery item not found", 404);
  }
  if (item.file_url?.startsWith("/uploads/")) {
    try {
      deleteStoredFile(item.file_url);
    } catch (error) {}
  }
  await query("DELETE FROM team_life_gallery WHERE id = ?", [id]);
}

async function toggleLifeItemStatus(id) {
  await ensureLifeAtGdbTables();
  const item = await getLifeItemById(id);
  if (!item) {
    throw new AppError("Gallery item not found", 404);
  }

  const newStatus = item.status === "active" ? "inactive" : "active";
  await query("UPDATE team_life_gallery SET status = ? WHERE id = ?", [newStatus, id]);
  return { id, status: newStatus };
}

module.exports = {
  createMember,
  getMembers,
  getMemberById,
  updateMember,
  deleteMember,
  toggleMemberStatus,
  getLifeSection,
  updateLifeSection,
  createLifeItem,
  getLifeItems,
  getLifeItemById,
  updateLifeItem,
  deleteLifeItem,
  toggleLifeItemStatus,
};
