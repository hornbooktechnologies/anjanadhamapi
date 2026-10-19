const fs = require('node:fs/promises');
const crypto = require('node:crypto');
const { query, transaction } = require('../../config/database');
const AppError = require('../../utils/AppError');
const { ensureSchema } = require('./schema');
const storage = require('./storage');
const { processImage } = require('./image');
const { isStoredFileReferenced } = require('../../utils/fileUpload');

const ORPHAN_GRACE_MS = 24 * 60 * 60 * 1000;
const isSuperAdmin = user => user.roles?.some(role => role.name === 'Super Admin');
const cleanAlt = value => String(value || '').replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, ' ').trim();

function serialize(row) {
  return {
    id: row.id, url: storage.publicUrl(row.filename), filename: row.filename,
    mimeType: row.mime_type, bytes: row.bytes, width: row.width, height: row.height,
    alt: row.alt_text, uploadedBy: row.uploaded_by_uuid, createdAt: row.created_at,
  };
}

async function upload(file, user, alt = '') {
  storage.publicBaseUrl();
  if (typeof alt !== 'string' || alt.length > 300) throw new AppError('Alt text must be at most 300 characters.', 400);
  const image = await processImage(file);
  await ensureSchema();
  const id = crypto.randomUUID();
  const row = {
    id, filename: id + '.webp', mime_type: image.mimeType, bytes: image.buffer.length,
    width: image.width, height: image.height,
    sha256: crypto.createHash('sha256').update(image.buffer).digest('hex'),
    alt_text: cleanAlt(alt), created_at: new Date(),
  };
  let wroteFile = false;
  try {
    await transaction(async connection => {
      // Existing accounts use integer IDs; the mapping supplies a stable admin UUID
      // without changing authentication IDs or losing attribution after account deletion.
      await connection.execute('INSERT INTO admin_media_admins (id,user_id) VALUES (?,?) ON DUPLICATE KEY UPDATE id=id', [crypto.randomUUID(), user.id]);
      const [actors] = await connection.execute('SELECT id FROM admin_media_admins WHERE user_id = ?', [user.id]);
      row.uploaded_by_uuid = actors[0].id;
      await connection.execute(`INSERT INTO admin_media
        (id,filename,mime_type,bytes,width,height,sha256,uploaded_by_uuid,alt_text,cleanup_after)
        VALUES (?,?,?,?,?,?,?,?,?,NULL)`,
      [row.id, row.filename, row.mime_type, row.bytes, row.width, row.height, row.sha256, row.uploaded_by_uuid, row.alt_text]);
      await storage.writeFile(row.filename, image.buffer);
      wroteFile = true;
    });
    return serialize(row);
  } catch (error) {
    if (wroteFile) {
      // A lost commit acknowledgement can mean the transaction actually committed.
      // Never delete a published file unless the database confirms it was rolled back.
      try {
        const records = await query('SELECT * FROM admin_media WHERE id = ?', [id]);
        if (records[0]?.status === 'published') return serialize(records[0]);
        if (!records.length) await storage.removeFile(row.filename);
      } catch (cleanupError) {
        console.error('Media upload reconciliation deferred:', id, cleanupError.code || cleanupError.message);
      }
    }
    throw error;
  }
}

async function list(user) {
  await ensureSchema();
  const rows = await query(`SELECT m.* FROM admin_media m JOIN admin_media_admins a ON a.id=m.uploaded_by_uuid
    WHERE m.status='published' ${isSuperAdmin(user) ? '' : 'AND a.user_id = ?'} ORDER BY m.created_at DESC,m.id DESC LIMIT 100`, isSuperAdmin(user) ? [] : [user.id]);
  return rows.map(serialize);
}

async function requestDeletion(id, user) {
  if (!storage.ID_PATTERN.test(id)) throw new AppError('Media not found.', 404);
  await ensureSchema();
  const rows = await query('SELECT m.*,a.user_id FROM admin_media m JOIN admin_media_admins a ON a.id=m.uploaded_by_uuid WHERE m.id = ?', [id]);
  const row = rows[0];
  if (!row) throw new AppError('Media not found.', 404);
  if (!isSuperAdmin(user) && row.user_id !== user.id) throw new AppError('You may only remove your own uploads.', 403);
  if (row.status !== 'published') return { id, deleted: row.status === 'deleted', queued: row.status === 'deleting' };
  if (await isStoredFileReferenced('/upload/' + row.filename)) return { id, deleted: false, skipped: true };
  // Forms can unmount while a content save finishes. Re-check references after a
  // one-hour grace period rather than deleting an image during a concurrent save.
  await query('UPDATE admin_media SET cleanup_after = LEAST(COALESCE(cleanup_after,DATE_ADD(NOW(), INTERVAL 1 HOUR)),DATE_ADD(NOW(), INTERVAL 1 HOUR)) WHERE id = ?', [id]);
  return { id, deleted: false, queued: true };
}

async function publicFile(filename) {
  if (!storage.FILE_PATTERN.test(filename)) throw new AppError('Media not found.', 404);
  let rows;
  try { rows = await query("SELECT * FROM admin_media WHERE filename = ? AND status = 'published'", [filename]); }
  catch (error) { if (error.code === 'ER_NO_SUCH_TABLE') throw new AppError('Media not found.', 404); throw error; }
  if (!rows[0] || rows[0].mime_type !== 'image/webp') throw new AppError('Media not found.', 404);
  try {
    const opened = await storage.openFile(filename);
    if (opened.stat.size !== Number(rows[0].bytes)) { await opened.handle.close(); throw new AppError('Media not found.', 404); }
    return { ...opened, record: rows[0] };
  } catch (error) {
    if (['ENOENT', 'ELOOP', 'ENOTDIR'].includes(error.code)) throw new AppError('Media not found.', 404);
    throw error;
  }
}

async function cleanup({ orphanGraceMs = ORPHAN_GRACE_MS } = {}) {
  await ensureSchema();
  const results = { deleted: 0, retained: 0, orphans: 0, pending: 0 };
  const rows = await query("SELECT * FROM admin_media WHERE status='deleting' OR (status='published' AND cleanup_after <= NOW()) ORDER BY cleanup_after,id LIMIT 100");
  for (const row of rows) {
    try {
      if (row.status === 'published') {
        if (await isStoredFileReferenced('/upload/' + row.filename)) {
          await query('UPDATE admin_media SET cleanup_after=NULL WHERE id = ?', [row.id]);
          results.retained++;
          continue;
        }
        const changed = await query("UPDATE admin_media SET status='deleting',deleted_at=NOW() WHERE id = ? AND status='published'", [row.id]);
        if (!changed.affectedRows) continue;
      }
      await storage.removeFile(row.filename);
      await query("UPDATE admin_media SET status='deleted',cleanup_after=NULL WHERE id = ? AND status='deleting'", [row.id]);
      results.deleted++;
    } catch (error) {
      results.pending++;
      console.error('Media cleanup will retry:', row.id, error.code || error.message);
    }
  }
  // Files left after a process crash are removed only after a grace period and a
  // successful metadata lookup. A database outage must never delete stored files.
  let entries;
  try { entries = await fs.readdir(await storage.directory(), { withFileTypes: true }); }
  catch (error) { if (error.code === 'ENOENT') return results; throw error; }
  for (const entry of entries) {
    if (!entry.isFile() || !storage.FILE_PATTERN.test(entry.name)) continue;
    const stat = await fs.lstat(await storage.filePath(entry.name));
    if (Date.now() - stat.mtimeMs < orphanGraceMs) continue;
    const records = await query('SELECT id,status FROM admin_media WHERE filename = ?', [entry.name]);
    if (!records.length) { await storage.removeFile(entry.name); results.orphans++; }
  }
  return results;
}

async function catalog() {
  await ensureSchema();
  const rows = await query("SELECT * FROM admin_media WHERE status='published' ORDER BY created_at,id");
  const escape = value => cleanAlt(value).replace(/[\\[\]!*_<>`]/g, character => '\\' + character);
  return '# Published images\n\n' + rows.map(row => '![' + escape(row.alt_text || 'Uploaded photo') + '](' + serialize(row).url + ')').join('\n\n') + '\n';
}

module.exports = { upload, list, publicFile, requestDeletion, cleanup, catalog };
