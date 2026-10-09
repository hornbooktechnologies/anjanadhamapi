const path = require('node:path');
const express = require('express');
const state = { categories: [], notices: [], nextId: 1 };
function reset() {
  state.categories = [{ id: 1, category_title: 'Campus', status: 'active', sequence: 1 }, { id: 2, category_title: 'Hidden', status: 'inactive', sequence: 2 }];
  state.notices = []; state.nextId = 1;
}
reset();
function stub(relative, exports) {
  const filename = require.resolve(path.join(__dirname, '../../src', relative));
  require.cache[filename] = { id: filename, filename, loaded: true, exports };
}
async function query(raw, values = []) {
  const sql = raw.replace(/\s+/g, ' ').trim();
  if (sql.includes('information_schema.COLUMNS')) return [{ COLUMN_NAME: 'publish_at' }];
  if (sql.startsWith('SELECT * FROM news_categories WHERE id')) return state.categories.filter(row => row.id === Number(values[0]));
  if (sql.includes('FROM news_categories WHERE 1=1')) {
    return sql.includes('COUNT(*)') ? [{ total: state.categories.length }] : structuredClone(state.categories);
  }
  if (sql.startsWith('SELECT id, title FROM news_content')) return [];
  if (sql.includes('FROM news_content n WHERE n.id = ?')) return structuredClone(state.notices.filter(row => row.id === Number(values.at(-1))).map(row => scheduleFields(row, values[0])));
  if (sql.startsWith('INSERT INTO news_content')) {
    const columns = sql.match(/\(([^)]+)\)/)[1].split(',').map(value => value.trim());
    const row = { id: state.nextId++ };
    columns.forEach((column, i) => { row[column] = values[i]; });
    row.date = new Date(row.date).toISOString().slice(0, 10);
    state.notices.push(row); return { insertId: row.id };
  }
  if (sql.startsWith('UPDATE news_content SET publish_status')) {
    const row = state.notices.find(row => row.id === Number(values.at(-1)));
    row.publish_status = values[0]; if (row.publish_status === 'draft') row.featured_listing = null;
    row.date = values[1]; row.publish_at = values[2];
    return {};
  }
  if (sql.startsWith('UPDATE news_content SET')) {
    const row = state.notices.find(row => row.id === Number(values.at(-1)));
    sql.split('SET ')[1].split(' WHERE')[0].split(',').forEach((assignment, i) => { row[assignment.split('=')[0].trim()] = values[i]; });
    row.date = new Date(row.date).toISOString().slice(0, 10); return {};
  }
  if (sql.startsWith('DELETE FROM news_content')) { state.notices = state.notices.filter(row => row.id !== Number(values[0])); return {}; }
  if (sql.includes('FROM news_content n INNER JOIN news_categories c')) {
    const isPublic = sql.includes("c.status = 'active'");
    const selectHasClock = sql.startsWith('SELECT n.*') && sql.includes('CASE WHEN');
    const params = selectHasClock ? values.slice(1) : values;
    const now = selectHasClock ? values[0] : params[0];
    let rows = state.notices.map(row => ({ ...row, category_title: state.categories.find(category => category.id === row.category_id)?.category_title }));
    if (isPublic) {
      rows = rows.filter(row => row.publish_status === 'published' && state.categories.find(category => category.id === row.category_id)?.status === 'active' && scheduleUtc(row) <= now);
    } else {
      let i = 0;
      for (const [clause, matches] of [
        ['n.title LIKE ?', (row, value) => row.title.includes(value.replaceAll('%', ''))],
        ['n.category_id = ?', (row, value) => row.category_id === Number(value)],
        ['n.publish_status = ?', (row, value) => row.publish_status === value],
      ]) if (sql.includes(clause)) { const value = params[i++]; rows = rows.filter(row => matches(row, value)); }
      if (sql.includes("AND n.publish_status = 'published'")) {
        const cutoff = params[i];
        const future = sql.split('WHERE')[1].includes('INTERVAL 330 MINUTE) > ?');
        rows = rows.filter(row => row.publish_status === 'published' && (future ? scheduleUtc(row) > cutoff : scheduleUtc(row) <= cutoff));
      }
    }
    if (sql.startsWith('SELECT COUNT(*)')) return [{ total: rows.length }];
    rows.sort((a, b) => scheduleUtc(b).localeCompare(scheduleUtc(a)) || b.id - a.id);
    return structuredClone(rows.slice(params.at(-1), params.at(-1) + params.at(-2)).map(row => scheduleFields(row, now)));
  }
  throw new Error(`Unexpected isolated SQL: ${sql}`);
}
function scheduleUtc(row) {
  return row.publish_at || new Date(`${row.date}T00:00:00+05:30`).toISOString().slice(0, 19).replace('T', ' ');
}
function scheduleFields(row, now) {
  const utc = scheduleUtc(row);
  const instant = new Date(utc.replace(' ', 'T') + 'Z');
  return { ...row, publish_at: instant.toISOString().replace('.000Z', 'Z'), publish_time: new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(instant), publication_state: row.publish_status === 'draft' ? 'draft' : utc > now ? 'scheduled' : 'published' };
}
stub('config/database', { query });
stub('utils/fileUpload', { deleteStoredFile: () => {} });
stub('utils/sequence', { getNextSequence: async () => state.notices.length + 1 });
stub('middlewares/auth.middleware', (req, res, next) => req.headers.authorization ? next() : res.status(401).json({ success: false }));
stub('middlewares/permission.middleware', permission => (req, res, next) => {
  const token = req.headers.authorization;
  const allowed = token === 'Bearer admin' || (token === 'Bearer editor' && permission !== 'news.content.publish');
  allowed ? next() : res.status(403).json({ success: false });
});
function createApp() {
  const app = express(); app.use(express.json());
  app.use('/api/news', require('../../src/modules/news/news.routes'));
  app.use((error, req, res, next) => res.status(error.statusCode || 500).json({ success: false, message: error.message }));
  return app;
}
module.exports = { createApp, reset, state, query };
