const crypto = require('node:crypto');
const { query, transaction } = require('../config/database');
const { normalizeUploadPath } = require('./uploadStorage');

let schemaPromise;
function ensureCleanupTable() {
  if (!schemaPromise) schemaPromise = query(`CREATE TABLE IF NOT EXISTS profile_file_cleanup (
    path_hash CHAR(64) PRIMARY KEY, file_url TEXT NOT NULL,
    due_at DATETIME NOT NULL, attempts INT NOT NULL DEFAULT 0,
    last_error VARCHAR(500) NULL, INDEX cleanup_due (due_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`).catch(error => { schemaPromise = null; throw error; });
  return schemaPromise;
}

const enqueueSql = `INSERT INTO profile_file_cleanup (path_hash,file_url,due_at) VALUES (?,?,?)
  ON DUPLICATE KEY UPDATE due_at = LEAST(due_at, VALUES(due_at))`;
function cleanupValues(url, delayMs = 0) {
  return [crypto.createHash('sha256').update(url).digest('hex'), url, new Date(Date.now() + delayMs)];
}

async function scheduleProfileCleanup(url, delayMs = 0) {
  if (!normalizeUploadPath(url)) return;
  await ensureCleanupTable();
  await query(enqueueSql, cleanupValues(url, delayMs));
}

// Commit the profile change and its cleanup job together. A failed save never
// removes the previous photo; a storage outage never loses the cleanup job.
async function changeProfileWithCleanup(sql, values, oldPhoto) {
  if (!normalizeUploadPath(oldPhoto)) return query(sql, values);
  await ensureCleanupTable();
  const result = await transaction(async connection => {
    const [changed] = await connection.query(sql, values);
    await connection.query(enqueueSql, cleanupValues(oldPhoto));
    return changed;
  });
  try { await processProfileCleanup(); }
  catch (error) { console.error('Profile saved; file cleanup will retry:', error.message); }
  return result;
}

async function processProfileCleanup() {
  await ensureCleanupTable();
  const jobs = await query('SELECT * FROM profile_file_cleanup WHERE due_at <= NOW() ORDER BY due_at LIMIT 25');
  const results = { deleted: 0, retained: 0, pending: 0 };
  const { cleanupStoredFile } = require('./fileUpload');
  for (const job of jobs) {
    try {
      const result = await cleanupStoredFile(job.file_url);
      await query('DELETE FROM profile_file_cleanup WHERE path_hash = ? AND due_at = ?', [job.path_hash, job.due_at]);
      if (result.skipped) results.retained++;
      else results.deleted++;
    } catch (error) {
      results.pending++;
      await query('UPDATE profile_file_cleanup SET attempts = attempts + 1, last_error = ?, due_at = DATE_ADD(NOW(), INTERVAL 5 MINUTE) WHERE path_hash = ?', [String(error.message).slice(0,500), job.path_hash]);
      console.error('Profile file cleanup queued for retry:', job.file_url, error.message);
    }
  }
  return results;
}

module.exports = { changeProfileWithCleanup, scheduleProfileCleanup, processProfileCleanup };
