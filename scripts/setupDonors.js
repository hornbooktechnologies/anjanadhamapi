const { query, pool } = require('../src/config/database');
const { ensureDonorsTable } = require('../src/modules/donors/donors.service');
async function main() {
  await ensureDonorsTable();
  for (const action of ['view', 'create', 'update', 'delete']) {
    const name = `donors.${action}`;
    const existing = await query('SELECT id FROM permissions WHERE name = ?', [name]);
    if (!existing.length) await query('INSERT INTO permissions (name,module) VALUES (?,?)', [name, 'donors']);
    // Give donor access only to roles already managing the corresponding trustee action.
    await query(`INSERT IGNORE INTO role_permissions (role_id, permission_id)
      SELECT rp.role_id, donor.id FROM role_permissions rp
      JOIN permissions member ON member.id=rp.permission_id AND member.name=?
      JOIN permissions donor ON donor.name=?`, [`key_members.${action}`, name]);
  }
  console.log('Donor table and permissions ready. Existing content is unchanged; no sample donors were imported.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => pool.end());
