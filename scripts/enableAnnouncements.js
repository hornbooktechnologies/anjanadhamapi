// Add announcement permissions without running unrelated schema/content migrations.
const { query, transaction, pool } = require('../src/config/database');
const { ensureAnnouncementSchedule } = require('../src/modules/news/news.schedule');
const names = [
  ...['view', 'create', 'update', 'delete'].map(action => `news.category.${action}`),
  ...['view', 'create', 'update', 'delete', 'publish'].map(action => `news.content.${action}`),
];
async function enable() {
  await ensureAnnouncementSchedule();
  await transaction(async connection => {
    for (const name of names) {
      await connection.execute('INSERT INTO permissions (name, module) VALUES (?, ?) ON DUPLICATE KEY UPDATE module=VALUES(module)', [name, 'news']);
    }
    await connection.execute(`INSERT IGNORE INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name = 'Super Admin' AND p.module = 'news'`);
  });
  const categories = await query('SELECT COUNT(*) AS total FROM news_categories');
  const notices = await query('SELECT COUNT(*) AS total FROM news_content');
  console.log(`Announcements enabled. Existing categories: ${categories[0].total}; existing notices: ${notices[0].total}. Content preserved.`);
}
enable().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => pool.end());
