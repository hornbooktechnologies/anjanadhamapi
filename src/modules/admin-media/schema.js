const { query } = require('../../config/database');

const statements = [
  `CREATE TABLE IF NOT EXISTS admin_media_admins (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    user_id INT NULL UNIQUE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS admin_media (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    filename VARCHAR(41) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
    mime_type VARCHAR(32) NOT NULL,
    bytes INT UNSIGNED NOT NULL,
    width INT UNSIGNED NOT NULL,
    height INT UNSIGNED NOT NULL,
    sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    uploaded_by_uuid CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    alt_text VARCHAR(300) NOT NULL DEFAULT '',
    status ENUM('published','deleting','deleted') NOT NULL DEFAULT 'published',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cleanup_after DATETIME NULL,
    deleted_at DATETIME NULL,
    INDEX media_cleanup (status, cleanup_after),
    FOREIGN KEY (uploaded_by_uuid) REFERENCES admin_media_admins(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

let initialization;
function ensureSchema() {
  if (!initialization) initialization = (async () => {
    for (const sql of statements) await query(sql);
    await query("INSERT INTO permissions (name,module) VALUES ('media.upload','media') ON DUPLICATE KEY UPDATE name=name");
  })().catch(error => { initialization = null; throw error; });
  return initialization;
}

module.exports = { ensureSchema, statements };
