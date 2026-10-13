const { query } = require('../config/database');
let initialization;

const normalizeSeoPage = value => String(value || '').trim().replace(/^\/+|\/+$/g, '') || 'home';
function ensureSeoPageLength() {
  if (!initialization) initialization = (async () => {
    const columns = await query('SHOW COLUMNS FROM seo_content');
    const page = columns.find(column => column.Field === 'page');
    const limit = Number(page?.Type?.match(/^varchar\((\d+)\)$/i)?.[1]);
    if (limit && limit < 255) await query('ALTER TABLE seo_content MODIFY COLUMN page VARCHAR(255) NOT NULL');
  })().catch(error => { initialization = null; throw error; });
  return initialization;
}

function normalizeSeoInput(data) {
  const normalized = { ...data, page: normalizeSeoPage(data.page) };
  for (const field of ['meta_title', 'meta_description', 'canonical_url', 'robots_tag', 'og_title', 'og_description', 'og_image', 'og_image_alt', 'twitter_title', 'twitter_description', 'twitter_image', 'twitter_image_alt']) {
    normalized[field] = typeof data[field] === 'string' ? data[field].trim() : '';
  }
  return normalized;
}

module.exports = { normalizeSeoPage, ensureSeoPageLength, normalizeSeoInput };
