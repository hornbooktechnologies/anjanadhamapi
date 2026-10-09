const { test, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

// Isolate all database/cloud operations. Never load the live MySQL pool.
const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'anjanadham-cleanup-'));
process.env.UPLOAD_DIR = temporaryRoot;
process.env.PROFILE_BLOB_BASE_URL = 'https://cleanup-test.public.blob.vercel-storage.com';
let members, donors, team, jobs, otherReferences, cloud, failSave, failReferences, failCloud;
const db = require.resolve('../src/config/database');
async function query(sql, values = []) {
  sql = sql.trim();
  if (sql.startsWith('CREATE TABLE')) return {};
  if (sql.startsWith('INSERT INTO profile_file_cleanup')) {
    const [hash, url, due] = values;
    const previous = jobs.get(hash);
    jobs.set(hash, { path_hash: hash, file_url: url, due_at: previous && previous.due_at < due ? previous.due_at : due, attempts: previous?.attempts || 0 });
    return {};
  }
  if (sql.startsWith('SELECT * FROM profile_file_cleanup')) return [...jobs.values()].filter(job => job.due_at <= new Date());
  if (sql.startsWith('DELETE FROM profile_file_cleanup')) {
    const job = jobs.get(values[0]);
    if (!values[1] || job?.due_at.getTime() === values[1].getTime()) jobs.delete(values[0]);
    return {};
  }
  if (sql.startsWith('UPDATE profile_file_cleanup')) {
    const job = jobs.get(values[1]);
    job.attempts++; job.last_error = values[0]; job.due_at = new Date(Date.now() + 300000);
    return {};
  }
  if (sql.startsWith('SELECT 1 AS matched')) {
    if (failReferences) throw Object.assign(new Error('Database unavailable'), { code: 'ECONNRESET' });
    return [...members.values(), ...donors.values(), ...team.values()].some(row => row.photo_url === values[0]) || otherReferences.has(values[0]) ? [{ matched: 1 }] : [];
  }
  const table = /(?:FROM|UPDATE) (key_members|donors|team_members)/.exec(sql)?.[1];
  const rows = { key_members: members, donors, team_members: team }[table];
  if (sql.startsWith('SELECT') && rows) return rows.has(Number(values[0])) ? [{ ...rows.get(Number(values[0])) }] : [];
  if (sql.startsWith('UPDATE') && rows) {
    if (failSave) throw new Error('Save failed');
    const row = rows.get(Number(values.at(-1)));
    const columns = sql.split(/SET\s+/)[1].split(/\s+WHERE/)[0].split(',').map(item => item.trim().split('=')[0].trim());
    columns.forEach((column, index) => { row[column] = values[index]; });
    return { affectedRows: 1 };
  }
  if (sql.startsWith('DELETE') && rows) {
    if (failSave) throw new Error('Delete failed');
    rows.delete(Number(values[0])); return { affectedRows: 1 };
  }
  throw new Error(`Unexpected isolated query: ${sql}`);
}
require.cache[db] = { id: db, filename: db, loaded: true, exports: { query,
  transaction: async callback => {
    const snapshot = structuredClone({ members, donors, team, jobs });
    try { return await callback({ query: async (...args) => [await query(...args)] }); }
    catch (error) { ({ members, donors, team, jobs } = snapshot); throw error; }
  },
} };
const blob = require.resolve('@vercel/blob');
require.cache[blob] = { id: blob, filename: blob, loaded: true, exports: {
  put: async (url, bytes) => { cloud.set(`/uploads/${url.split('/').slice(1).join('/')}`, Buffer.from(bytes)); return {}; },
  del: async url => { if (failCloud) throw new Error('Storage unavailable'); cloud.delete(new URL(url).pathname); },
} };
const translations = require.resolve('../src/modules/translations/translations.service');
require.cache[translations] = { id: translations, filename: translations, loaded: true, exports: {
  overlayEntityTranslations: async (_entity, row) => row,
  saveEntityTranslations: async () => {}, deleteEntityTranslations: async () => {},
} };
const { getUploadFileCopies, normalizeUploadPath } = require('../src/utils/uploadStorage');
const { cleanupStoredFile } = require('../src/utils/fileUpload');
const { processProfileCleanup, scheduleProfileCleanup } = require('../src/utils/profileCleanup');
const keyMembers = require('../src/modules/key-members/key-members.service');
const donorService = require('../src/modules/donors/donors.service');
// Group validation is tested separately; keep these tests focused on file cleanup.
const groupServicePath = require.resolve('../src/modules/team/team-groups.service');
require.cache[groupServicePath] = { id: groupServicePath, filename: groupServicePath, loaded: true, exports: { validateMemberGroup: async title => title, ensureTeamGroups: async () => {} } };
const teamService = require('../src/modules/team/team.service');
const touched = new Set();
function photo() {
  const url = `/uploads/portraits/cleanup-test-${crypto.randomUUID()}.png`;
  for (const file of getUploadFileCopies(url)) {
    fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, 'original bytes'); touched.add(file);
  }
  cloud.set(url, Buffer.from('original bytes'));
  return url;
}
function assertRemoved(url) { assert.equal(cloud.has(url), false); for (const file of getUploadFileCopies(url)) assert.equal(fs.existsSync(file), false); }
function assertRetained(url) { assert.equal(cloud.has(url), true); for (const file of getUploadFileCopies(url)) assert.equal(fs.existsSync(file), true); }
const member = url => ({ id: 1, name: 'Original name', photo_url: url, sequence: 1, status: 'active' });
beforeEach(() => {
  members = new Map(); donors = new Map(); team = new Map(); jobs = new Map(); cloud = new Map(); otherReferences = new Set();
  failSave = failReferences = failCloud = false;
});
after(() => { for (const file of touched) if (fs.existsSync(file)) fs.unlinkSync(file); fs.rmdirSync(path.join(temporaryRoot, 'portraits')); fs.rmdirSync(temporaryRoot); });

test('removing a trustee photo deletes cloud, configured, legacy and public copies', async () => {
  const url = photo(); members.set(1, member(url));
  await keyMembers.updateKeyMember(1, { photo_url: '' });
  assert.equal(members.get(1).photo_url, ''); assertRemoved(url); assert.equal(jobs.size, 0);
});
test('replacing a URL cleans the old portrait and preserves the new portrait', async () => {
  const old = photo(), next = photo(); members.set(1, member(old));
  await keyMembers.updateKeyMember(1, { photo_url: next }); assertRemoved(old); assertRetained(next);
});
test('deleting a trustee cleans its photo after deleting the record', async () => {
  const url = photo(); members.set(1, member(url)); await keyMembers.deleteKeyMember(1);
  assert.equal(members.has(1), false); assertRemoved(url);
});
test('shared references protect photos until the final profile is deleted', async () => {
  const url = photo(); members.set(1, member(url)); donors.set(2, { ...member(url), id: 2, amount: 100, contribution_date: '2026-10-07' });
  await keyMembers.deleteKeyMember(1); assertRetained(url);
  await donorService.removeDonor(2); assertRemoved(url);
});
test('unchanged photo is retained when other profile fields are saved', async () => {
  const url = photo(); members.set(1, member(url)); await keyMembers.updateKeyMember(1, { name: 'Updated name', photo_url: url });
  assertRetained(url); assert.equal(jobs.size, 0);
});
test('a failed profile save retains old files and rolls back its cleanup job', async () => {
  const url = photo(); members.set(1, member(url)); failSave = true;
  await assert.rejects(keyMembers.updateKeyMember(1, { photo_url: '' }), /Save failed/);
  assertRetained(url); assert.equal(members.get(1).photo_url, url); assert.equal(jobs.size, 0);
});
test('database reference failures retain files and persist a retry job', async () => {
  const url = photo(); members.set(1, member(url)); failReferences = true;
  await keyMembers.deleteKeyMember(1); assertRetained(url); assert.equal(jobs.size, 1);
  failReferences = false; for (const job of jobs.values()) job.due_at = new Date(0);
  await processProfileCleanup(); assertRemoved(url); assert.equal(jobs.size, 0);
});
test('cloud failures retain a retry job and leave local copies intact', async () => {
  const url = photo(); members.set(1, member(url)); failCloud = true;
  await keyMembers.updateKeyMember(1, { photo_url: '' }); assertRetained(url); assert.equal(jobs.size, 1);
  failCloud = false; for (const job of jobs.values()) job.due_at = new Date(0);
  await processProfileCleanup(); assertRemoved(url);
});
test('unused uploads wait 24 hours; uploads saved to profiles remain', async () => {
  const unused = photo(), used = photo(); members.set(1, member(used));
  await scheduleProfileCleanup(unused, 86400000); await scheduleProfileCleanup(used, 86400000);
  await processProfileCleanup(); assertRetained(unused); assertRetained(used);
  for (const job of jobs.values()) job.due_at = new Date(0);
  await processProfileCleanup(); assertRemoved(unused); assertRetained(used);
});
test('photos referenced by other content are retained', async () => {
  const url = photo(); otherReferences.add(url); assert.equal((await cleanupStoredFile(url)).skipped, true); assertRetained(url);
});
test('external, fallback and traversal paths cannot be deleted', async () => {
  for (const url of ['https://unrelated.example/a.png', '/images/default.png', '/uploads/../outside.png', '/uploads/%2e%2e/outside.png', '/uploads/portraits/..\\outside.png']) {
    assert.equal(normalizeUploadPath(url), null); assert.deepEqual(await cleanupStoredFile(url), { deleted: false, skipped: true });
  }
});
test('donor photo replacement cleans old files', async () => {
  const url = photo(); donors.set(2, { ...member(url), id: 2, amount: 100, contribution_date: '2026-10-07' });
  await donorService.saveDonor(2, { name: 'Donor', amount: 100, contribution_date: '2026-10-07', photo_url: '', status: 'active' }); assertRemoved(url);
});
test('team photo removal and deletion use the same cleanup', async () => {
  const url = photo(); team.set(3, { ...member(url), id: 3 });
  await teamService.updateMember(3, { name: 'Member', photo_url: '' }); assertRemoved(url);
  const next = photo(); team.set(3, { ...member(next), id: 3 }); await teamService.deleteMember(3); assertRemoved(next);
});
test('processed portrait uploads preserve exact bytes and register abandoned-file cleanup', async () => {
  const sharp = require('sharp');
  const bytes = await sharp({ create: { width: 8, height: 8, channels: 4, background: '#cdb27b' } }).png().toBuffer();
  const { savePortrait } = require('../src/utils/portraitUpload');
  const url = await savePortrait({ buffer: bytes, mimetype: 'image/png' });
  assert.deepEqual(cloud.get(url), bytes);
  assert.equal(jobs.size, 1); assert.ok([...jobs.values()][0].due_at > new Date(Date.now() + 86300000));
});
test('base64 replacement cleans the old photo while preserving the newly stored photo', async () => {
  const sharp = require('sharp');
  const bytes = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#cdb27b' } }).png().toBuffer();
  const old = photo(); members.set(1, member(old));
  await keyMembers.updateKeyMember(1, { photo_url: `data:image/png;base64,${bytes.toString('base64')}` });
  assertRemoved(old); assert.match(members.get(1).photo_url, /^\/uploads\/key_members\//);
  assert.equal(cloud.has(members.get(1).photo_url), true);
});
test('missing production storage configuration blocks deletion', async () => {
  const url = photo();
  const previousBase = process.env.PROFILE_BLOB_BASE_URL, previousVercel = process.env.VERCEL;
  try {
    delete process.env.PROFILE_BLOB_BASE_URL; process.env.VERCEL = '1';
    await assert.rejects(cleanupStoredFile(url), /Persistent profile storage is not configured/); assertRetained(url);
  } finally {
    process.env.PROFILE_BLOB_BASE_URL = previousBase;
    if (previousVercel === undefined) delete process.env.VERCEL; else process.env.VERCEL = previousVercel;
  }
});
