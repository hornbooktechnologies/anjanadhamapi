const fs = require('node:fs/promises');
const path = require('node:path');
const { put, del } = require('@vercel/blob');
const { normalizeUploadPath, getUploadTargetDir } = require('./uploadStorage');

function getProfileBlobUrl(value) {
  const uploadPath = normalizeUploadPath(value);
  if (!uploadPath || !/^\/uploads\/(portraits|key_members)\//.test(uploadPath)) return null;
  const base = process.env.PROFILE_BLOB_BASE_URL;
  if (!base) return null;
  const origin = new URL(base);
  if (origin.protocol !== 'https:' || !origin.hostname.endsWith('.public.blob.vercel-storage.com')) throw new Error('Invalid profile storage URL');
  return new URL(uploadPath, origin).href;
}

async function writeProfileFile(uploadPath, buffer, contentType) {
  const blobUrl = getProfileBlobUrl(uploadPath);
  if (blobUrl) {
    await put(uploadPath.slice(1), buffer, { access: 'public', addRandomSuffix: false, contentType, cacheControlMaxAge: 60 });
  } else {
    if (process.env.VERCEL) throw new Error('Persistent profile storage is not configured');
    if (!normalizeUploadPath(uploadPath)) throw new Error('Invalid profile upload path');
    const parts = uploadPath.slice(9).split('/');
    const filename = parts.pop();
    await fs.writeFile(path.join(getUploadTargetDir(parts.join('/')), filename), buffer);
  }
  return uploadPath;
}

async function deleteProfileBlob(uploadPath) {
  const url = getProfileBlobUrl(uploadPath);
  if (!url && process.env.VERCEL && /^\/uploads\/(portraits|key_members)\//.test(uploadPath)) throw new Error('Persistent profile storage is not configured');
  if (!url) return false;
  await del(url);
  return true;
}

module.exports = { getProfileBlobUrl, writeProfileFile, deleteProfileBlob };
