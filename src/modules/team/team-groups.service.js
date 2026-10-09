const { query, transaction } = require('../../config/database');
const AppError = require('../../utils/AppError');

let initialization;
function ensureTeamGroups() {
  if (!initialization) {
    initialization = initialize().catch(error => { initialization = null; throw error; });
  }
  return initialization;
}

async function initialize() {
  const tables = await query("SELECT COUNT(*) AS count FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'team_groups'");
  await query(`CREATE TABLE IF NOT EXISTS team_groups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL UNIQUE,
    description TEXT NULL,
    sequence INT NOT NULL DEFAULT 0,
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  const columns = await query("SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'team_members' AND COLUMN_NAME = 'group_name'");
  const legacyEnum = (columns[0]?.COLUMN_TYPE || '').toLowerCase().startsWith('enum(');
  if (legacyEnum) await query('ALTER TABLE team_members MODIFY group_name VARCHAR(255) NOT NULL');
  const locationColumn = await query("SELECT COUNT(*) AS count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'team_members' AND COLUMN_NAME = 'location'");
  if (!Number(locationColumn[0]?.count)) {
    await query('ALTER TABLE team_members ADD COLUMN location VARCHAR(255) NULL AFTER designation');
  }
  if (!Number(tables[0]?.count) || legacyEnum) {
    await query("INSERT IGNORE INTO team_groups (title, sequence) VALUES ('Board of Directors', 1), ('Leadership', 2)");
  }
  // Import existing assignments without renaming members or restoring deleted empty groups.
  await query(`INSERT IGNORE INTO team_groups (title, sequence)
    SELECT DISTINCT group_name, 3 FROM team_members WHERE group_name IS NOT NULL AND TRIM(group_name) <> ''`);
}

async function getGroups({ status, include_members } = {}) {
  await ensureTeamGroups();
  const params = [];
  let where = '';
  if (status === 'active' || status === 'inactive') { where = 'WHERE g.status = ?'; params.push(status); }
  const groups = await query(`SELECT g.*, COUNT(m.id) AS member_count,
    COALESCE(SUM(m.status = 'active'), 0) AS active_member_count
    FROM team_groups g LEFT JOIN team_members m ON m.group_name = g.title
    ${where} GROUP BY g.id ORDER BY g.sequence ASC, g.id ASC`, params);
  if (include_members !== 'true') return groups;
  const members = await query(`SELECT m.* FROM team_members m
    INNER JOIN team_groups g ON g.title = m.group_name
    WHERE m.status = 'active' AND g.status = 'active' ORDER BY m.sequence ASC, m.id ASC`);
  return groups.filter(group => group.status === 'active').map(group => ({
    ...group, members: members.filter(member => member.group_name === group.title),
  }));
}

async function getGroup(id) {
  await ensureTeamGroups();
  const rows = await query('SELECT * FROM team_groups WHERE id = ?', [id]);
  if (!rows.length) throw new AppError('Team group not found', 404);
  return rows[0];
}

async function validateMemberGroup(title, previousTitle) {
  await ensureTeamGroups();
  const rows = await query('SELECT * FROM team_groups WHERE title = ?', [title]);
  if (!rows.length) throw new AppError('Select a group from Team Groups', 400);
  const group = rows[0];
  if (group.status !== 'active' && group.title !== previousTitle) {
    throw new AppError('This team group is inactive. Select an active group.', 400);
  }
  return group.title;
}

async function saveGroup(id, data) {
  await ensureTeamGroups();
  try {
    if (!id) {
      const result = await query('INSERT INTO team_groups (title, description, sequence, status) VALUES (?, ?, ?, ?)',
        [data.title, data.description || '', data.sequence, data.status]);
      return getGroup(result.insertId);
    }
    await transaction(async connection => {
      const [rows] = await connection.execute('SELECT * FROM team_groups WHERE id = ? FOR UPDATE', [id]);
      if (!rows.length) throw new AppError('Team group not found', 404);
      await connection.execute('UPDATE team_groups SET title = ?, description = ?, sequence = ?, status = ? WHERE id = ?',
        [data.title, data.description || '', data.sequence, data.status, id]);
      if (rows[0].title !== data.title) {
        await connection.execute('UPDATE team_members SET group_name = ? WHERE group_name = ?', [data.title, rows[0].title]);
      }
    });
    return getGroup(id);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') throw new AppError('A team group with this title already exists', 409);
    throw error;
  }
}

async function deleteGroup(id) {
  await ensureTeamGroups();
  await transaction(async connection => {
    const [groups] = await connection.execute('SELECT * FROM team_groups WHERE id = ? FOR UPDATE', [id]);
    if (!groups.length) throw new AppError('Team group not found', 404);
    const [counts] = await connection.execute('SELECT COUNT(*) AS total FROM team_members WHERE group_name = ?', [groups[0].title]);
    if (Number(counts[0]?.total)) throw new AppError('Move this group’s members to another group before deleting it. You can deactivate the group to hide it from the website.', 409);
    await connection.execute('DELETE FROM team_groups WHERE id = ?', [id]);
  });
  return { id: Number(id), deleted: true };
}

module.exports = { ensureTeamGroups, getGroups, getGroup, validateMemberGroup, saveGroup, deleteGroup };
