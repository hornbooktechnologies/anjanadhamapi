const fs = require('node:fs/promises');
const path = require('node:path');
const { put, del } = require('@vercel/blob');
const { normalizeUploadPath, getUploadTargetDir } = require('./uploadStorage');

function isBannerUpload(value) {
  const normalized = normalizeUploadPath(value);
  return Boolean(normalized && (/^\/uploads\/[a-f0-9]{32}\.(webp|png|jpe?g|gif|avif|mp4|webm|mov)$/i.test(normalized)
    || normalized.startsWith('/uploads/homepage/banners/')));
}

function getBannerBlobUrl(value) {
  if (!isBannerUpload(value)) return null;
  // Reuse the project's existing public media store, without provisioning one.
  const base = process.env.PROFILE_BLOB_BASE_URL;
  if (!base) return null;
  const origin = new URL(base);
  if (origin.protocol !== 'https:' || !origin.hostname.endsWith('.public.blob.vercel-storage.com')) {
    throw new Error('Invalid banner storage URL');
  }
  return new URL(value, origin).href;
}

async function writeBannerFile(uploadPath, buffer) {
  if (!isBannerUpload(uploadPath)) throw new Error('Invalid banner upload path');
  if (getBannerBlobUrl(uploadPath)) {
    await put(uploadPath.slice(1), buffer, { access: 'public', addRandomSuffix: false });
  } else {
    if (process.env.VERCEL) throw new Error('Persistent banner storage is not configured');
    const parts = uploadPath.slice(9).split('/');
    const filename = parts.pop();
    await fs.writeFile(path.join(getUploadTargetDir(parts.join('/')), filename), buffer);
  }
  return uploadPath;
}

async function deleteBannerBlob(uploadPath) {
  const url = getBannerBlobUrl(uploadPath);
  if (!url && process.env.VERCEL && isBannerUpload(uploadPath)) throw new Error('Persistent banner storage is not configured');
  if (!url) return false;
  await del(url);
  return true;
}

module.exports = { isBannerUpload, getBannerBlobUrl, writeBannerFile, deleteBannerBlob };
