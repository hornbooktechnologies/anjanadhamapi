const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const express = require('express');
const sharp = require('sharp');

// Real JWT auth, multipart parsing, Sharp, HTTP and filesystem; isolated MySQL
// records and a unique temp volume. No deployed data or SMTP is touched.
const env = { nodeEnv: 'test', port: 5000, jwt: { secret: 'isolated-media-test', expiry: '15m' } };
function stub(relative, exports) {
  const id = require.resolve(relative); require.cache[id] = { id, filename: id, loaded: true, exports };
}
stub('../src/config/env', env);
let records = [], actors = [], referenced = new Set(), failCommit = '', failRead = false, permissionEnabled = true;
let server, base, temp, png;
async function query(input, params = []) {
  const sql = input.replace(/\s+/g, ' ').trim();
  if (sql.startsWith('CREATE TABLE') || sql.startsWith('INSERT INTO permissions')) return {};
  if (sql.startsWith('SELECT id, name, email, status FROM users')) return [1,2,3].includes(params[0]) ? [{ id: params[0], name: 'Test admin', status: 'active' }] : [];
  if (sql.startsWith('SELECT r.id, r.name FROM roles')) return [{ id: params[0], name: params[0] === 1 ? 'Super Admin' : 'Editor' }];
  if (sql.startsWith('SELECT DISTINCT p.name')) return permissionEnabled ? [{ name: 'media.upload' }] : [];
  if (sql.startsWith('INSERT INTO admin_media_admins')) { if (!actors.some(row => row.user_id === params[1])) actors.push({ id: params[0], user_id: params[1] }); return {}; }
  if (sql.startsWith('SELECT id FROM admin_media_admins')) return actors.filter(row => row.user_id === params[0]);
  if (sql.startsWith('INSERT INTO admin_media ')) {
    if (records.some(row => row.id === params[0])) throw new Error('Duplicate UUID');
    const names = ['id','filename','mime_type','bytes','width','height','sha256','uploaded_by_uuid','alt_text'];
    records.push({ ...Object.fromEntries(names.map((name, index) => [name, params[index]])), status: 'published', created_at: new Date(), cleanup_after: null }); return {};
  }
  if (sql.startsWith('SELECT * FROM admin_media WHERE id')) { if (failRead) throw new Error('Database offline'); return records.filter(row => row.id === params[0]); }
  if (sql.startsWith('SELECT * FROM admin_media WHERE filename')) return records.filter(row => row.filename === params[0] && row.status === 'published');
  if (sql.startsWith('SELECT id,status FROM admin_media WHERE filename')) { if (failRead) throw new Error('Database offline'); return records.filter(row => row.filename === params[0]); }
  if (sql.startsWith('SELECT * FROM admin_media WHERE status=\'deleting\'')) return records.filter(row => row.status === 'deleting' || row.status === 'published' && row.cleanup_after && row.cleanup_after <= new Date());
  if (sql.startsWith("SELECT * FROM admin_media WHERE status='published'")) return records.filter(row => row.status === 'published');
  if (sql.startsWith('SELECT m.*,a.user_id')) return records.filter(row => row.id === params[0]).map(row => ({ ...row, user_id: actors.find(actor => actor.id === row.uploaded_by_uuid).user_id }));
  if (sql.startsWith('SELECT m.* FROM admin_media')) return records.filter(row => row.status === 'published' && (!params.length || actors.find(actor => actor.id === row.uploaded_by_uuid).user_id === params[0]));
  if (sql.startsWith('UPDATE admin_media SET cleanup_after')) { records.find(row => row.id === params[0]).cleanup_after = sql.includes('cleanup_after=NULL') ? null : new Date(Date.now() + 3600000); return { affectedRows: 1 }; }
  if (sql.startsWith("UPDATE admin_media SET status='deleting'")) {
    const row = records.find(row => row.id === params[0] && row.status === 'published');
    if (!row) return { affectedRows: 0 }; row.status = 'deleting'; return { affectedRows: 1 };
  }
  if (sql.startsWith("UPDATE admin_media SET status='deleted'")) { records.find(row => row.id === params[0]).status = 'deleted'; return { affectedRows: 1 }; }
  throw new Error('Unexpected isolated SQL: ' + sql);
}
stub('../src/config/database', { query, transaction: async work => {
  const backup = structuredClone({ records, actors });
  try {
    const result = await work({ execute: async (sql, params) => [await query(sql, params)] });
    if (failCommit === 'rollback') throw new Error('Commit failed');
    if (failCommit === 'acknowledgement') { failCommit = ''; throw Object.assign(new Error('Lost commit acknowledgement'), { committed: true }); }
    return result;
  } catch (error) { if (!error.committed) ({ records, actors } = backup); throw error; }
} });
stub('../src/utils/fileUpload', { isStoredFileReferenced: async url => referenced.has(url) });
const storage = require('../src/modules/admin-media/storage');
const service = require('../src/modules/admin-media/service');
const { generateAccessToken } = require('../src/utils/jwt');
const { admin, publicImages, protectLegacyPath } = require('../src/modules/admin-media/routes');
const tokens = [1,2,3].map(id => generateAccessToken({ id }));

before(async () => {
  temp = await fs.mkdtemp(path.join(os.tmpdir(), 'anjanadham-media-'));
  env.uploadDir = temp;
  process.env.PUBLIC_API_URL = 'https://media.example.test';
  png = await sharp({ create: { width: 16, height: 12, channels: 4, background: '#f78c21' } }).png().toBuffer();
  const app = express(); app.use(express.json());
  app.use('/api/admin/media', admin); app.use('/upload', publicImages); app.use(protectLegacyPath);
  app.use('/uploads', express.static(temp));
  app.use((error, req, res, next) => res.status(error.statusCode || 500).json({ message: error.message }));
  server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  base = 'http://127.0.0.1:' + server.address().port;
});
beforeEach(async () => {
  records = []; actors = []; referenced = new Set(); failCommit = ''; failRead = false; permissionEnabled = true;
  const dir = path.join(temp, 'admin-media');
  try { for (const name of await fs.readdir(dir)) await fs.unlink(path.join(dir, name)); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
});
after(async () => {
  await new Promise(resolve => server.close(resolve));
  assert.ok(path.resolve(temp).startsWith(path.resolve(os.tmpdir()) + path.sep));
  await fs.rm(temp, { recursive: true, force: true });
});
function post(buffer = png, { type = 'image/png', name = 'photo.png', token = tokens[1], extra = false, alt } = {}) {
  const body = new FormData(); body.append('file', new Blob([buffer], { type }), name);
  if (extra) body.append('file', new Blob([png]), 'second.png');
  if (alt !== undefined) body.append('alt', alt);
  return fetch(base + '/api/admin/media', { method: 'POST', headers: token ? { Authorization: 'Bearer ' + token } : {}, body });
}
async function uploaded(options) { const response = await post(png, options); assert.equal(response.status, 201, await response.clone().text()); return (await response.json()).data; }
const localUrl = file => base + '/upload/' + file.filename;

test('upload enforces authentication and upload permission before accepting files', async () => {
  assert.equal((await post(png, { token: '' })).status, 401);
  assert.equal((await post(png, { token: 'invalid' })).status, 401);
  permissionEnabled = false;
  assert.equal((await post()).status, 403);
  assert.equal((await post(png, { token: tokens[0] })).status, 201);
});

test('server signatures and full decode reject SVG, scripts, forged and truncated files', async () => {
  for (const buffer of [Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), Buffer.from('MZ executable'), png.subarray(0, 24), Buffer.from('%PDF-1.7')]) {
    assert.equal((await post(buffer, { type: 'image/png', name: 'safe.png' })).status, 415);
  }
  assert.equal(records.length, 0);
});

test('multipart limits reject multiple files, oversized data and missing files', async () => {
  assert.equal((await post(png, { extra: true })).status, 400);
  assert.equal((await post(Buffer.alloc(5 * 1024 * 1024 + 1))).status, 413);
  const response = await fetch(base + '/api/admin/media', { method: 'POST', headers: { Authorization: 'Bearer ' + tokens[1] }, body: new FormData() });
  assert.equal(response.status, 400);
});

test('aborting clients cannot bypass the two-image processing concurrency limit', async () => {
  const original = service.upload;
  const release = []; let signalStarted;
  const started = new Promise(resolve => { signalStarted = resolve; });
  service.upload = async () => { if (release.length === 1) signalStarted(); return new Promise(resolve => release.push(resolve)); };
  const controllers = [new AbortController(), new AbortController()];
  const pending = controllers.map(controller => {
    const body = new FormData(); body.append('file', new Blob([png]), 'photo.png');
    return fetch(base + '/api/admin/media', { method: 'POST', headers: { Authorization: 'Bearer ' + tokens[1] }, body, signal: controller.signal }).catch(() => null);
  });
  try {
    await started; controllers.forEach(controller => controller.abort());
    await Promise.all(pending);
    assert.equal((await post()).status, 429);
  } finally {
    release.forEach(resolve => resolve({ id: crypto.randomUUID(), url: 'https://media.example.test/upload/test.webp' }));
    service.upload = original;
    await new Promise(resolve => setImmediate(resolve));
  }
});

test('actual bytes are re-encoded, filenames are UUIDs, and attribution is a stable admin UUID', async () => {
  const file = await uploaded({ type: 'application/x-msdownload', name: '../../secret.exe' });
  assert.match(file.filename, storage.FILE_PATTERN);
  assert.equal(file.url, 'https://media.example.test/upload/' + file.filename);
  assert.match(file.uploadedBy, storage.ID_PATTERN);
  const second = await uploaded(); assert.equal(second.uploadedBy, file.uploadedBy); assert.notEqual(second.id, file.id);
  const metadata = await sharp(await fs.readFile(await storage.filePath(file.filename))).metadata();
  assert.equal(metadata.format, 'webp'); assert.equal(metadata.width, 16);
});

test('production refuses missing or unsafe canonical URL and non-persistent relative storage configuration', async () => {
  const previous = { mode: env.nodeEnv, root: env.uploadDir, url: process.env.PUBLIC_API_URL };
  env.nodeEnv = 'production';
  try {
    for (const url of [undefined, 'https://media.example.test/api', 'https://user:password@example.test/', 'javascript:alert(1)']) {
      if (url === undefined) delete process.env.PUBLIC_API_URL; else process.env.PUBLIC_API_URL = url;
      assert.equal((await post()).status, 503);
    }
    process.env.PUBLIC_API_URL = previous.url; env.uploadDir = './uploads';
    assert.equal((await post()).status, 503); assert.equal(records.length, 0);
  } finally { env.nodeEnv = previous.mode; env.uploadDir = previous.root; process.env.PUBLIC_API_URL = previous.url; }
});

test('admin listings require permission and expose only the caller uploads unless Super Admin', async () => {
  const file = await uploaded();
  assert.equal((await fetch(base + '/api/admin/media')).status, 401);
  const list = token => fetch(base + '/api/admin/media', { headers: { Authorization: 'Bearer ' + token } });
  assert.equal((await (await list(tokens[2])).json()).data.length, 0);
  assert.equal((await (await list(tokens[1])).json()).data[0].id, file.id);
  assert.equal((await (await list(tokens[0])).json()).data[0].id, file.id);
  permissionEnabled = false; assert.equal((await list(tokens[1])).status, 403);
});

test('all four supported formats decode successfully and metadata is stripped', async () => {
  for (const format of ['jpeg', 'png', 'webp', 'avif']) {
    const buffer = await sharp(png).withMetadata({ exif: { IFD0: { Artist: 'Private attribution' } } }).toFormat(format).toBuffer();
    const response = await post(buffer); assert.equal(response.status, 201, format + ': ' + await response.clone().text());
    const file = (await response.json()).data;
    const result = await sharp(await fs.readFile(await storage.filePath(file.filename))).metadata();
    assert.equal(result.exif, undefined); assert.equal(result.icc, undefined);
  }
});

test('large images are capped without stretching', async () => {
  const wide = await sharp({ create: { width: 6000, height: 30, channels: 3, background: 'red' } }).png().toBuffer();
  const response = await post(wide); assert.equal(response.status, 201);
  const file = (await response.json()).data; assert.equal(file.width, 4096); assert.ok(file.height <= 30);
});

test('a compressed image declaring excessive pixel dimensions is rejected before decoding', async () => {
  const bomb = Buffer.from(png); bomb.writeUInt32BE(90000, 16); bomb.writeUInt32BE(90000, 20);
  let crc = 0xffffffff;
  for (const byte of bomb.subarray(12, 29)) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  bomb.writeUInt32BE((crc ^ 0xffffffff) >>> 0, 29);
  assert.equal((await post(bomb)).status, 415); assert.equal(records.length, 0);
});

test('public reads require a published MySQL record, send headers, and support HEAD and conditional GET', async () => {
  const file = await uploaded();
  const response = await fetch(localUrl(file)); assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'image/webp');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.match(response.headers.get('cache-control'), /max-age=3600/);
  assert.equal((await response.arrayBuffer()).byteLength, file.bytes);
  const head = await fetch(localUrl(file), { method: 'HEAD' }); assert.equal(head.status, 200); assert.equal((await head.text()).length, 0);
  assert.equal((await fetch(localUrl(file), { headers: { 'If-None-Match': response.headers.get('etag'), 'Cache-Control': 'max-age=0' } })).status, 304);
  records[0].status = 'deleted'; assert.equal((await fetch(localUrl(file))).status, 404);
  records = []; assert.equal((await fetch(localUrl(file))).status, 404);
});

test('unknown filenames, traversal and encoded legacy aliases cannot bypass the registry', async () => {
  const file = await uploaded();
  for (const url of ['/upload/.env','/upload/photo.svg','/upload/%2e%2e%2fsecret.webp','/upload','/uploads/admin-media/' + file.filename,'/uploads/%61dmin-media/' + file.filename,'/uploads/other/%2e%2e/admin-media/' + file.filename]) {
    assert.equal((await fetch(base + url)).status, 404, url);
  }
  const filename = crypto.randomUUID() + '.webp'; await storage.writeFile(filename, png);
  assert.equal((await fetch(base + '/upload/' + filename)).status, 404);
});

test('a failed commit removes its orphan; a lost acknowledgement preserves the committed file', async () => {
  failCommit = 'rollback'; assert.equal((await post()).status, 503); assert.equal(records.length, 0);
  assert.deepEqual(await fs.readdir(await storage.directory()), []);
  failCommit = 'acknowledgement'; const file = await uploaded(); assert.equal((await fetch(localUrl(file))).status, 200);
});

test('exclusive writes cannot overwrite an existing UUID file', async () => {
  const id = crypto.randomUUID(); const filename = id + '.webp'; await storage.writeFile(filename, Buffer.from('preserve'));
  const original = crypto.randomUUID; crypto.randomUUID = () => id;
  try { assert.equal((await post()).status, 503); }
  finally { crypto.randomUUID = original; }
  assert.equal((await fs.readFile(await storage.filePath(filename))).toString(), 'preserve');
});

test('deletion respects ownership and references, queues drafts, and cleanup retries failed work', async () => {
  const file = await uploaded();
  const remove = token => fetch(base + '/api/admin/media/' + file.id, { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } });
  assert.equal((await remove(tokens[2])).status, 403);
  referenced.add('/upload/' + file.filename);
  assert.equal((await (await remove(tokens[1])).json()).data.skipped, true);
  referenced.clear(); assert.equal((await (await remove(tokens[1])).json()).data.queued, true);
  assert.equal((await fetch(localUrl(file))).status, 200);
  records[0].cleanup_after = new Date(0); referenced.add('/upload/' + file.filename);
  assert.equal((await service.cleanup()).retained, 1);
  referenced.clear(); records[0].cleanup_after = new Date(0);
  assert.equal((await service.cleanup()).deleted, 1);
  assert.equal((await fetch(localUrl(file))).status, 404);
  assert.equal(records[0].status, 'deleted');
});

test('orphan reconciliation waits for a grace period and never deletes during a database outage', async () => {
  const filename = crypto.randomUUID() + '.webp'; await storage.writeFile(filename, png);
  assert.equal((await service.cleanup()).orphans, 0);
  failRead = true; await assert.rejects(service.cleanup({ orphanGraceMs: 0 }));
  assert.ok(await fs.stat(await storage.filePath(filename)));
  failRead = false; assert.equal((await service.cleanup({ orphanGraceMs: 0 })).orphans, 1);
});

test('unconfirmed rollback cleanup retains files until database reconciliation is possible', async () => {
  failCommit = 'rollback'; failRead = true;
  assert.equal((await post()).status, 503); assert.equal(records.length, 0);
  assert.equal((await fs.readdir(await storage.directory())).length, 1);
  failRead = false; failCommit = '';
  assert.equal((await service.cleanup({ orphanGraceMs: 0 })).orphans, 1);
});

test('failed unlink remains non-public and is retried without losing the registry tombstone', async () => {
  const file = await uploaded(); records[0].cleanup_after = new Date(0);
  const original = storage.removeFile;
  storage.removeFile = async () => { throw new Error('Volume temporarily unavailable'); };
  try { assert.equal((await service.cleanup()).pending, 1); }
  finally { storage.removeFile = original; }
  assert.equal(records[0].status, 'deleting'); assert.equal((await fetch(localUrl(file))).status, 404);
  assert.equal((await service.cleanup()).deleted, 1); assert.equal(records[0].status, 'deleted');
});

test('public reads reject symlinks even when metadata names a published file', async context => {
  const file = await uploaded(); const target = await storage.filePath(file.filename);
  const privatePath = path.join(temp, 'private-test-image.webp'); await fs.writeFile(privatePath, png);
  await fs.unlink(target);
  try { await fs.symlink(privatePath, target, 'file'); }
  catch (error) { if (['EPERM','EACCES','ENOTSUP'].includes(error.code)) return context.skip('Host does not permit creating symlinks'); throw error; }
  assert.equal((await fetch(localUrl(file))).status, 404);
  assert.ok(await fs.stat(privatePath));
});

test('a directory junction or symlink cannot replace the media storage directory', async context => {
  await uploaded();
  const alternateRoot = path.join(temp, 'link-root'); await fs.mkdir(alternateRoot);
  try { await fs.symlink(path.join(temp, 'admin-media'), path.join(alternateRoot, 'admin-media'), process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) { if (['EPERM','EACCES','ENOTSUP'].includes(error.code)) return context.skip('Host does not permit directory links'); throw error; }
  const original = env.uploadDir; env.uploadDir = alternateRoot;
  try { await assert.rejects(storage.directory(), error => error.statusCode === 503); }
  finally { env.uploadDir = original; }
});

test('catalog is derived from published records with escaped alt text and canonical URLs', async () => {
  const file = await uploaded({ alt: 'x]\n![bad](javascript:alert(1))' });
  const catalog = await service.catalog();
  assert.ok(catalog.includes(file.url)); assert.ok(catalog.includes('x\\] \\!\\[bad\\]'));
  records[0].status = 'deleted'; assert.ok(!(await service.catalog()).includes(file.url));
});
