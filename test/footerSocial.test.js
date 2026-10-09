const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
let contact, links, nextId, failSave, server, base;
function stub(relative, exports) {
  const filename = require.resolve(relative);
  require.cache[filename] = { id: filename, filename, loaded: true, exports };
}
async function query(input, values = []) {
  const sql = input.replace(/\s+/g, ' ').trim();
  if (sql.startsWith('SELECT * FROM contact_details')) return [{ ...contact }];
  if (sql.startsWith('SELECT id FROM contact_details')) return [{ id: contact.id }];
  if (sql.startsWith('SELECT * FROM social_links')) return links.slice().sort((a, b) => a.sequence - b.sequence || a.id - b.id).map(link => ({ ...link }));
  if (sql.startsWith('SELECT COALESCE(MAX(sequence)')) return [{ next_sequence: Math.max(0, ...links.map(link => link.sequence)) + 1 }];
  if (sql.startsWith('UPDATE contact_details')) { Object.assign(contact, { phone: values[0], email: values[1], address: values[2], footer_description: values[3] }); return {}; }
  if (sql.startsWith('INSERT INTO social_links') || sql.startsWith('UPDATE social_links')) {
    if (failSave) throw new Error('Simulated save failure');
    const row = { platform_name: values[0], icon_url: values[1], url: values[2], alt_text: values[3], sequence: values[4], status: values[5] };
    if (sql.startsWith('UPDATE')) Object.assign(links.find(link => link.id === Number(values[6])), row);
    else { row.id = nextId++; links.push(row); }
    return { insertId: row.id };
  }
  if (sql.startsWith('DELETE FROM social_links')) { links = sql.includes('NOT IN') ? links.filter(link => values.includes(link.id)) : []; return {}; }
  throw new Error(`Unexpected isolated SQL: ${sql}`);
}
stub('../src/config/database', { query, transaction: async work => {
  const backup = structuredClone({ contact, links, nextId });
  try { return await work({ execute: async (sql, values) => [await query(sql, values)] }); }
  catch (error) { ({ contact, links, nextId } = backup); throw error; }
} });
stub('../src/utils/fileUpload', { uploadBase64File: async () => '/uploads/social/icon.svg', deleteStoredFile: () => {} });
stub('../src/utils/mailer', { sendMail: async () => {} });
stub('../src/utils/sequence', { getNextSequence: async () => 1 });
stub('../src/middlewares/auth.middleware', (req, res, next) => req.headers.authorization ? next() : res.status(401).json({ success: false }));
stub('../src/middlewares/permission.middleware', () => (req, res, next) => req.headers.authorization === 'Bearer admin' ? next() : res.status(403).json({ success: false }));
const express = require('express');
before(async () => {
  const app = express(); app.use(express.json()); app.use('/api/global-content', require('../src/modules/global-content/global-content.routes'));
  app.use((error, req, res, next) => res.status(error.statusCode || 500).json({ success: false, message: error.message, details: error.details }));
  server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api/global-content/footer`;
});
after(async () => { await new Promise(resolve => server.close(resolve)); });
beforeEach(() => {
  contact = { id: 1, phone: '', email: '', address: '', footer_description: '' };
  links = [
    { id: 1, platform_name: 'YouTube', url: 'https://youtube.com/@example', sequence: 1, status: 'active' },
    { id: 2, platform_name: 'X', url: 'https://x.com/example', sequence: 2, status: 'inactive' },
  ]; nextId = 3; failSave = false;
});
const save = (socialLinks, token = 'admin') => fetch(base, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ phone: '', email: '', address: '', footer_description: '', socialLinks }) });

test('footer API saves all five platforms, icon uploads, status and order, and returns IDs for subsequent edits', async () => {
  const response = await save([
    { platform_name: 'Instagram', url: 'https://instagram.com/example', sequence: 1, status: 'active', icon_url: 'data:image/svg+xml;base64,fixture' },
    { ...links[1], sequence: 2 },
    { ...links[0], sequence: 3 },
    { platform_name: 'Facebook', url: 'https://facebook.com/example', sequence: 4, status: 'active' },
    { platform_name: 'WhatsApp', url: 'https://wa.me/919999999999', sequence: 5, status: 'active' },
  ]);
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.deepEqual(result.data.socialLinks.map(link => link.platform_name), ['Instagram', 'X', 'YouTube', 'Facebook', 'WhatsApp']);
  assert.equal(result.data.socialLinks[0].icon_url, '/uploads/social/icon.svg');
  assert.equal(result.data.socialLinks[1].status, 'inactive');
  assert.ok(result.data.socialLinks.every(link => link.id));
  const stableIds = result.data.socialLinks.map(link => link.id);
  const savedAgain = await save(result.data.socialLinks);
  assert.equal(savedAgain.status, 200);
  assert.deepEqual((await savedAgain.json()).data.socialLinks.map(link => link.id), stableIds);
  assert.equal((await fetch(base).then(r => r.json())).data.socialLinks.length, 5);
});
test('removing links deletes only the omitted records', async () => {
  const response = await save([links[1]]);
  assert.equal(response.status, 200);
  assert.deepEqual(links.map(link => link.id), [2]);
});
test('invalid or non-web URLs are rejected before saving', async () => {
  const before = structuredClone({ contact, links });
  for (const url of ['javascript:alert(1)', 'ftp://example.org', '#']) {
    assert.equal((await save([{ platform_name: 'Instagram', url }])).status, 400);
  }
  assert.deepEqual({ contact, links }, before);
});
test('public reads work without authentication and writes enforce permissions', async () => {
  assert.equal((await fetch(base)).status, 200);
  assert.equal((await save([], null)).status, 401);
  assert.equal((await save([], 'viewer')).status, 403);
  assert.equal(links.length, 2);
});
test('a failed link save rolls back the contact and social link changes', async () => {
  const before = structuredClone({ contact, links }); failSave = true;
  assert.equal((await save([{ platform_name: 'Instagram', url: 'https://instagram.com/example' }])).status, 500);
  assert.deepEqual({ contact, links }, before);
});
