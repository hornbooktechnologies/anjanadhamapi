const { query } = require('../config/database');
const initializations = new Map();

function ensureContentSeoColumns(table) {
  if (!['blogs', 'facilities'].includes(table)) throw new Error('Unsupported SEO content table');
  if (!initializations.has(table)) {
    const initialization = (async () => {
      const columns = await query(`SHOW COLUMNS FROM ${table}`);
      const names = new Set(columns.map(column => column.Field));
      const additions = [];
      if (!names.has('meta_title')) additions.push('ADD COLUMN meta_title VARCHAR(255) NULL');
      if (!names.has('meta_description')) additions.push('ADD COLUMN meta_description TEXT NULL');
      if (additions.length) await query(`ALTER TABLE ${table} ${additions.join(', ')}`);
    })().catch(error => { initializations.delete(table); throw error; });
    initializations.set(table, initialization);
  }
  return initializations.get(table);
}

const seoValue = (value, previous = null) => value === undefined ? previous : (typeof value === 'string' ? value.trim() || null : null);
module.exports = { ensureContentSeoColumns, seoValue };
