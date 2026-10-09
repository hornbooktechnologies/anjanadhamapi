// Copy referenced portraits into persistent storage without changing profile URLs.
// Run after configuring PROFILE_BLOB_BASE_URL and BLOB_READ_WRITE_TOKEN.
require('../src/config/env');
const fs = require('node:fs/promises');
const crypto = require('node:crypto');
const { query, pool } = require('../src/config/database');
const { getAbsolutePathFromPublicUploadPath } = require('../src/utils/uploadStorage');
const { getProfileBlobUrl, writeProfileFile } = require('../src/utils/profileStorage');

async function main() {
  const rows = await query(`SELECT photo_url FROM key_members WHERE photo_url IS NOT NULL
    UNION SELECT photo_url FROM donors WHERE photo_url IS NOT NULL
    UNION SELECT photo_url FROM team_members WHERE photo_url IS NOT NULL`);
  let migrated = 0;
  for (const { photo_url: url } of rows) {
    const cloudUrl = getProfileBlobUrl(url);
    if (!cloudUrl) continue;
    const bytes = await fs.readFile(getAbsolutePathFromPublicUploadPath(url));
    const verifyUrl = () => `${cloudUrl}?verify=${crypto.randomUUID()}`;
    const existing = await fetch(verifyUrl(), { cache: 'no-store' });
    if (!existing.ok) {
      if (existing.status !== 404) throw new Error(`Cannot check ${url}: ${existing.status}`);
      await writeProfileFile(url, bytes, url.endsWith('.png') ? 'image/png' : url.endsWith('.webp') ? 'image/webp' : 'image/jpeg');
    }
    const stored = await fetch(verifyUrl(), { cache: 'no-store' });
    if (!stored.ok) throw new Error(`Cannot read migrated portrait ${url}: ${stored.status}`);
    const downloaded = Buffer.from(await stored.arrayBuffer());
    const hash = value => crypto.createHash('sha256').update(value).digest('hex');
    if (hash(bytes) !== hash(downloaded)) throw new Error(`Portrait bytes differ: ${url}`);
    console.log(`Verified unchanged portrait: ${url}`);
    migrated++;
  }
  console.log(`Migration verified: ${migrated} portraits. Profile records were not changed.`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => pool.end());
