const fs = require('node:fs/promises');
const { constants } = require('node:fs');
const path = require('node:path');
const env = require('../../config/env');
const AppError = require('../../utils/AppError');

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const ID_PATTERN = new RegExp('^' + UUID + '$');
const FILE_PATTERN = new RegExp('^' + UUID + '\\.webp$');
const MEDIA_DIRECTORY = 'admin-media';

function publicBaseUrl() {
  const configured = process.env.PUBLIC_API_URL;
  if (!configured && env.nodeEnv === 'production') throw new AppError('PUBLIC_API_URL is required for media uploads.', 503);
  let url;
  try { url = new URL(configured || 'http://localhost:' + env.port); }
  catch { throw new AppError('PUBLIC_API_URL must be an absolute HTTP(S) origin.', 503); }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new AppError('PUBLIC_API_URL must contain only the API origin, without /api or a query.', 503);
  }
  return url.origin;
}

function publicUrl(filename) {
  if (!FILE_PATTERN.test(filename)) throw new AppError('Invalid media filename.', 404);
  return publicBaseUrl() + '/upload/' + filename;
}

function mediaPath(value) {
  if (typeof value !== 'string') return null;
  let pathname = value;
  if (/^https?:\/\//i.test(value)) {
    try { const url = new URL(value); if (url.search || url.hash) return null; pathname = url.pathname; }
    catch { return null; }
  }
  const filename = pathname.startsWith('/upload/') ? pathname.slice(8) : '';
  return FILE_PATTERN.test(filename) ? '/upload/' + filename : null;
}

async function directory(create = false) {
  if (env.nodeEnv === 'production' && (!env.uploadDir || !path.isAbsolute(env.uploadDir))) {
    throw new AppError('Configure UPLOAD_DIR as the absolute persistent-volume path.', 503);
  }
  const root = path.resolve(env.uploadDir || './uploads');
  if (create) await fs.mkdir(root, { recursive: true, mode: 0o700 });
  const realRoot = await fs.realpath(root);
  const target = path.join(realRoot, MEDIA_DIRECTORY);
  if (create) await fs.mkdir(target, { recursive: true, mode: 0o700 });
  const stat = await fs.lstat(target);
  if (!stat.isDirectory() || stat.isSymbolicLink() || await fs.realpath(target) !== target) {
    throw new AppError('Unsafe media storage directory.', 503);
  }
  return target;
}

async function filePath(filename, create = false) {
  if (!FILE_PATTERN.test(filename)) throw new AppError('Invalid media filename.', 404);
  const root = await directory(create);
  const target = path.resolve(root, filename);
  if (path.dirname(target) !== root) throw new AppError('Invalid media filename.', 404);
  return target;
}

async function writeFile(filename, buffer) {
  const target = await filePath(filename, true);
  const flags = constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | (constants.O_NOFOLLOW || 0);
  const handle = await fs.open(target, flags, 0o600);
  try { await handle.writeFile(buffer); await handle.sync(); }
  catch (error) { await handle.close(); await fs.unlink(target).catch(() => {}); throw error; }
  await handle.close();
}

async function openFile(filename) {
  const target = await filePath(filename);
  const before = await fs.lstat(target);
  if (!before.isFile() || before.isSymbolicLink()) throw new AppError('Media not found.', 404);
  const handle = await fs.open(target, constants.O_RDONLY | (constants.O_NOFOLLOW || 0));
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.ino !== before.ino || stat.dev !== before.dev) throw new AppError('Media not found.', 404);
    return { handle, stat };
  } catch (error) { await handle.close(); throw error; }
}

async function removeFile(filename) {
  try {
    const target = await filePath(filename);
    const stat = await fs.lstat(target);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new AppError('Unsafe media file.', 503);
    await fs.unlink(target);
    return true;
  } catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}

module.exports = { ID_PATTERN, FILE_PATTERN, MEDIA_DIRECTORY, mediaPath, publicUrl, publicBaseUrl, directory, filePath, writeFile, openFile, removeFile };
