const { test } = require('node:test');
const assert = require('node:assert/strict');

const rows = { blogs: [], facilities: [], seo_content: [] };
const migrated = new Set();
let seoPageLength = 100, pageMigrations = 0;
function stub(relative, exports) {
  const id = require.resolve(relative);
  require.cache[id] = { id, filename: id, loaded: true, exports };
}
stub('../src/config/database', { query: async (input, values = []) => {
  const sql = input.replace(/\s+/g, ' ').trim();
  if (sql.startsWith('CREATE TABLE')) return {};
  const table = sql.match(/(?:FROM|INTO|UPDATE|TABLE) (blogs|facilities|seo_content)\b/)?.[1];
  if (sql.startsWith('SHOW COLUMNS FROM seo_content')) return [{ Field: 'page', Type: `varchar(${seoPageLength})` }];
  if (sql.startsWith('SHOW COLUMNS FROM')) return ['id', 'title', ...(migrated.has(table) ? ['meta_title', 'meta_description'] : [])].map(Field => ({ Field }));
  if (sql.startsWith('ALTER TABLE seo_content')) { seoPageLength = 255; pageMigrations++; return {}; }
  if (sql.startsWith('ALTER TABLE')) { assert.ok(!migrated.has(table)); migrated.add(table); return {}; }
  if (sql.startsWith('INSERT INTO')) {
    const columns = sql.match(/\(([^)]+)\)/)[1].split(',').map(value => value.trim());
    assert.equal(columns.length, values.length); assert.ok(values.every(value => value !== undefined));
    const row = Object.fromEntries(columns.map((name, index) => [name, values[index]]));
    row.id = rows[table].length + 1; rows[table].push(row);
    return { insertId: row.id };
  }
  if (sql.startsWith('UPDATE')) {
    const columns = sql.match(/ SET (.*?) WHERE /)[1].split(',').map(value => value.trim().split(' = ')[0]);
    const key = sql.includes('WHERE page = ?') ? 'page' : 'id';
    const row = rows[table].find(record => String(record[key]) === String(values.at(-1)));
    assert.ok(row); assert.equal(columns.length + 1, values.length); assert.ok(values.every(value => value !== undefined));
    columns.forEach((name, index) => { row[name] = values[index]; }); return {};
  }
  if (sql.startsWith('SELECT')) {
    let result = rows[table].map(row => ({ ...row }));
    if (sql.includes('WHERE id = ?')) result = result.filter(row => String(row.id) === String(values[0]));
    if (sql.includes('WHERE page = ?')) result = result.filter(row => row.page === values[0]);
    if (sql.includes('WHERE page IN')) result = result.filter(row => values.slice(0, -1).includes(row.page)).sort((a, b) => Number(b.page === values.at(-1)) - Number(a.page === values.at(-1)) || b.id - a.id).slice(0, 1);
    return result;
  }
  throw new Error('Unexpected isolated SQL: ' + sql);
} });
stub('../src/utils/fileUpload', { uploadBase64File: async () => { throw new Error('Unexpected upload'); }, deleteStoredFile() {} });
stub('../src/utils/sequence', { getNextSequence: async () => 7, resequenceTable: async () => {} });
stub('../src/utils/mailer', { sendMail: async () => {} });
stub('../src/modules/translations/translations.service', {
  saveEntityTranslations: async () => {}, deleteEntityTranslations: async () => {},
  overlayEntityTranslations: async (entity, records, lang, fields) => {
    const overlay = row => lang === 'hi' && fields.includes('meta_title') ? { ...row, meta_title: 'हिंदी मेटा शीर्षक' } : row;
    return Array.isArray(records) ? records.map(overlay) : overlay(records);
  },
});

const blogs = require('../src/modules/blogs/blogs.service');
const facilities = require('../src/modules/facilities/facilities.service');
const globalSeo = require('../src/modules/global-content/global-content.service');
const blogValidation = require('../src/modules/blogs/blogs.validation');
const facilityValidation = require('../src/modules/facilities/facilities.validation');

test('both dynamic page APIs save, read, preserve and explicitly clear metadata on existing schemas', async () => {
  for (const [table, create, update, read, list] of [
    ['blogs', blogs.createBlog, blogs.updateBlog, blogs.getBlogById, blogs.getAllBlogs],
    ['facilities', facilities.createFacility, facilities.updateFacility, facilities.getFacilityById, facilities.getAllFacilities],
  ]) {
    const record = await create({ title: 'Page', meta_title: '  SEO title  ', meta_description: '  SEO description  ' });
    assert.equal(record.meta_title, 'SEO title'); assert.equal(record.meta_description, 'SEO description');
    assert.equal(record.sequence, 7); assert.ok(migrated.has(table));
    const edited = await update(record.id, { title: 'Edited page' });
    assert.equal(edited.meta_title, 'SEO title'); assert.equal(edited.meta_description, 'SEO description');
    assert.equal((await list())[0].meta_title, 'SEO title');
    assert.equal((await read(record.id, 'hi')).meta_title, 'हिंदी मेटा शीर्षक');
    const cleared = await update(record.id, { meta_title: '', meta_description: null });
    assert.equal(cleared.meta_title, null); assert.equal(cleared.meta_description, null);
  }
});

test('create and update validation accept SEO fields, allow clearing, and reject oversized values', () => {
  for (const schema of [blogValidation.createBlogSchema, blogValidation.updateBlogSchema, facilityValidation.createFacilitySchema, facilityValidation.updateFacilitySchema]) {
    assert.equal(schema.validate({ title: 'Page', meta_title: 'Title', meta_description: 'Description' }).error, undefined);
    assert.equal(schema.validate({ title: 'Page', meta_title: '', meta_description: null }).error, undefined);
    assert.ok(schema.validate({ title: 'Page', meta_title: 'x'.repeat(256) }).error);
    assert.ok(schema.validate({ title: 'Page', meta_description: 'x'.repeat(1001) }).error);
  }
});

test('static and district SEO save normalized paths, preserve social/schema fields, and update instead of duplicating', async () => {
  const saved = await globalSeo.createOrUpdateSeo({ page: '/districts/gujarat/banaskantha/', meta_title: '  District SEO  ', meta_description: '  District description  ', og_title: 'Social title', schema_type: 'WebPage', schema_json: '{"@type":"WebPage"}' });
  assert.equal(saved.page, 'districts/gujarat/banaskantha');
  assert.equal(saved.meta_title, 'District SEO'); assert.equal(saved.og_title, 'Social title');
  assert.equal(saved.schema_items[0]['@type'], 'WebPage');
  assert.equal((await globalSeo.getSeoByPage('/districts/gujarat/banaskantha')).id, saved.id);
  await globalSeo.createOrUpdateSeo({ ...saved, meta_description: 'Updated description' });
  assert.equal(rows.seo_content.length, 1);
  const edited = await globalSeo.updateSeoById(saved.id, { ...saved, meta_title: 'Edited title', status: 'inactive' });
  assert.equal(edited.meta_title, 'Edited title'); assert.equal(edited.status, 'inactive');
  assert.equal((await globalSeo.getAllSeoContent()).length, 1);
  assert.equal(pageMigrations, 1);
});

test('existing slash-prefixed entries remain readable without losing saved metadata', async () => {
  rows.seo_content.push({ id: 99, page: '/about-us', meta_title: 'Legacy SEO', status: 'active' });
  assert.equal((await globalSeo.getSeoByPage('about-us')).meta_title, 'Legacy SEO');
  assert.equal((await globalSeo.createOrUpdateSeo({ page: '/', meta_title: 'Home SEO' })).page, 'home');
});
