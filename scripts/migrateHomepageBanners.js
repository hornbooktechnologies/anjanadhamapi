// Copy existing active homepage banners into the already configured media store.
// Run without --write to inspect; existing database URLs remain unchanged.
require('../src/config/env');
const fs = require('node:fs/promises');
const { head, BlobNotFoundError } = require('@vercel/blob');
const { query } = require('../src/config/database');
const { getAbsolutePathFromPublicUploadPath } = require('../src/utils/uploadStorage');
const { isBannerUpload, getBannerBlobUrl, writeBannerFile } = require('../src/utils/bannerStorage');

async function main() {
  const write = process.argv.includes('--write');
  const rows = await query("SELECT DISTINCT file_url FROM homepage_banners WHERE status = 'active'");
  for (const { file_url: uploadPath } of rows) {
    if (!isBannerUpload(uploadPath)) continue;
    const target = getBannerBlobUrl(uploadPath);
    if (!target) throw new Error('Persistent banner storage is not configured');
    let exists = false;
    try { await head(target); exists = true; }
    catch (error) { if (!(error instanceof BlobNotFoundError)) throw error; }
    if (exists) { console.log(`Already stored: ${uploadPath}`); continue; }
    const buffer = await fs.readFile(getAbsolutePathFromPublicUploadPath(uploadPath));
    if (write) await writeBannerFile(uploadPath, buffer);
    console.log(`${write ? 'Migrated' : 'Would migrate'}: ${uploadPath} (${buffer.length} bytes)`);
  }
}

main().then(() => process.exit(0)).catch(error => {
  console.error(error.message);
  process.exit(1);
});
