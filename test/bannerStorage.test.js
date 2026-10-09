const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

let writes, deletes;
const blob = require.resolve('@vercel/blob');
require.cache[blob] = { id: blob, filename: blob, loaded: true, exports: {
  put: async (...args) => { writes.push(args); },
  del: async url => { deletes.push(url); },
} };
const storage = require('../src/utils/bannerStorage');
const uploadPath = '/uploads/8b27b06aa7416f9195087f9d95598838.webp';

beforeEach(() => {
  writes = []; deletes = [];
  process.env.PROFILE_BLOB_BASE_URL = 'https://banner-test.public.blob.vercel-storage.com';
  delete process.env.VERCEL;
});

test('legacy banner URLs resolve to persistent storage and retain their pathname', async () => {
  const bytes = Buffer.from('banner');
  assert.equal(await storage.writeBannerFile(uploadPath, bytes), uploadPath);
  assert.equal(writes[0][0], uploadPath.slice(1));
  assert.deepEqual(writes[0][1], bytes);
  assert.equal(writes[0][2].addRandomSuffix, false);
  assert.equal(storage.getBannerBlobUrl(uploadPath), `https://banner-test.public.blob.vercel-storage.com${uploadPath}`);
  await storage.deleteBannerBlob(uploadPath);
  assert.equal(deletes.length, 1);
});

test('banner paths cannot redirect or write arbitrary files or profile uploads', async () => {
  for (const candidate of ['/uploads/../secret.webp', '/uploads/homepage/banners/../../secret.webp', '/uploads/portraits/person.webp', 'https://example.com/image.webp']) {
    assert.equal(storage.getBannerBlobUrl(candidate), null);
    await assert.rejects(storage.writeBannerFile(candidate, Buffer.from('image')), /Invalid banner upload path/);
  }
  assert.equal(writes.length, 0);
});

test('serverless uploads require persistent storage instead of temporary disk', async () => {
  delete process.env.PROFILE_BLOB_BASE_URL;
  process.env.VERCEL = '1';
  await assert.rejects(storage.writeBannerFile(uploadPath, Buffer.from('image')), /Persistent banner storage/);
  assert.equal(writes.length, 0);
});

test('local development without Blob continues to use its upload directory', async () => {
  delete process.env.PROFILE_BLOB_BASE_URL;
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'banner-storage-'));
  const uploadStoragePath = require.resolve('../src/utils/uploadStorage');
  const bannerStoragePath = require.resolve('../src/utils/bannerStorage');
  const oldDir = process.env.UPLOAD_DIR;
  process.env.UPLOAD_DIR = dir;
  delete require.cache[uploadStoragePath];
  delete require.cache[bannerStoragePath];
  try {
    const local = require(bannerStoragePath);
    await local.writeBannerFile(uploadPath, Buffer.from('local banner'));
    assert.equal(await fs.readFile(path.join(dir, path.basename(uploadPath)), 'utf8'), 'local banner');
  } finally {
    if (oldDir === undefined) delete process.env.UPLOAD_DIR;
    else process.env.UPLOAD_DIR = oldDir;
    await fs.rm(dir, { recursive: true });
  }
});
