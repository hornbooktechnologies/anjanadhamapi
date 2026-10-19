const fs = require('node:fs/promises');
const { pool } = require('../src/config/database');
const { ensureSchema } = require('../src/modules/admin-media/schema');
const service = require('../src/modules/admin-media/service');

async function main() {
  const action = process.argv[2] || 'migrate';
  if (action === 'migrate') { await ensureSchema(); console.log('Admin media schema and media.upload permission are ready.'); }
  else if (action === 'cleanup') console.log(JSON.stringify(await service.cleanup()));
  else if (action === 'catalog' && process.argv[3]) { await fs.writeFile(process.argv[3], await service.catalog(), { flag: 'wx' }); console.log('Media index exported from MySQL.'); }
  else throw new Error('Usage: node scripts/adminMedia.js migrate|cleanup|catalog <new-output.md>');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => pool.end());
