const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
let groups, members, nextId, tableExists, columnType, locationExists, calls, service;
const servicePath = require.resolve('../src/modules/team/team-groups.service');
const databasePath = require.resolve('../src/config/database');
const equal = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();
async function query(input, values = []) {
  const sql = input.replace(/\s+/g, ' ').trim(); calls.push({ sql, values });
  if (sql.includes('information_schema.TABLES')) return [{ count: Number(tableExists) }];
  if (sql.startsWith('CREATE TABLE')) { tableExists = true; return {}; }
  if (sql.includes('information_schema.COLUMNS')) return sql.includes("COLUMN_NAME = 'location'") ? [{ count: Number(locationExists) }] : [{ COLUMN_TYPE: columnType }];
  if (sql.startsWith('ALTER TABLE')) {
    if (sql.includes('ADD COLUMN location')) locationExists = true;
    else columnType = 'varchar(255)';
    return {};
  }
  if (sql.startsWith('INSERT IGNORE')) {
    const titles = sql.includes('SELECT DISTINCT') ? members.map(member => member.group_name) : ['Board of Directors', 'Leadership'];
    for (const title of titles) if (!groups.some(group => equal(group.title, title))) groups.push({ id: nextId++, title, status: 'active', sequence: nextId, description: '' });
    return {};
  }
  if (sql.startsWith('SELECT g.*')) return groups.filter(group => !values[0] || group.status === values[0]).map(group => ({ ...group,
    member_count: members.filter(member => equal(member.group_name, group.title)).length,
    active_member_count: members.filter(member => equal(member.group_name, group.title) && member.status === 'active').length,
  })).sort((a, b) => a.sequence - b.sequence || a.id - b.id);
  if (sql.startsWith('SELECT m.*')) return members.filter(member => member.status === 'active' && groups.some(group => equal(group.title, member.group_name) && group.status === 'active'));
  if (sql.startsWith('SELECT * FROM team_groups WHERE title')) return groups.filter(group => equal(group.title, values[0])).map(group => ({ ...group }));
  if (sql.startsWith('SELECT * FROM team_groups WHERE id')) return groups.filter(group => group.id === Number(values[0])).map(group => ({ ...group }));
  if (sql.startsWith('INSERT INTO team_groups')) {
    if (groups.some(group => equal(group.title, values[0]))) throw Object.assign(new Error('Duplicate'), { code: 'ER_DUP_ENTRY' });
    const id = nextId++; groups.push({ id, title: values[0], description: values[1], sequence: values[2], status: values[3] }); return { insertId: id };
  }
  if (sql.startsWith('UPDATE team_groups')) {
    const id = Number(values[4]);
    if (groups.some(group => group.id !== id && equal(group.title, values[0]))) throw Object.assign(new Error('Duplicate'), { code: 'ER_DUP_ENTRY' });
    Object.assign(groups.find(group => group.id === id), { title: values[0], description: values[1], sequence: values[2], status: values[3] }); return {};
  }
  if (sql.startsWith('UPDATE team_members')) { for (const member of members) if (equal(member.group_name, values[1])) member.group_name = values[0]; return {}; }
  if (sql.startsWith('SELECT COUNT(*) AS total FROM team_members')) return [{ total: members.filter(member => equal(member.group_name, values[0])).length }];
  if (sql.startsWith('DELETE FROM team_groups')) { groups = groups.filter(group => group.id !== Number(values[0])); return {}; }
  throw new Error(`Unexpected database operation: ${sql}`);
}
require.cache[databasePath] = { id: databasePath, filename: databasePath, loaded: true, exports: {
  query,
  transaction: async work => {
    const backup = structuredClone({ groups, members });
    try { return await work({ execute: async (sql, values) => [await query(sql, values)] }); }
    catch (error) { groups = backup.groups; members = backup.members; throw error; }
  },
} };
beforeEach(() => {
  groups = []; nextId = 1; tableExists = false; columnType = "enum('Board of Directors','Leadership')"; locationExists = false; calls = [];
  members = [{ id: 1, name: 'Existing person', group_name: 'Leadership', status: 'active', photo_url: '/uploads/original.webp', sequence: 1 }];
  delete require.cache[servicePath]; service = require(servicePath);
});
test('legacy enum is converted once without changing existing profiles or assignments', async () => {
  const original = structuredClone(members);
  await Promise.all([service.getGroups(), service.getGroups()]);
  assert.deepEqual(members, original);
  assert.equal(columnType, 'varchar(255)');
  assert.equal(calls.filter(call => call.sql.includes('MODIFY group_name')).length, 1);
  assert.equal(calls.filter(call => call.sql.includes('ADD COLUMN location')).length, 1);
  assert.equal(locationExists, true);
  assert.deepEqual(groups.map(group => group.title), ['Board of Directors', 'Leadership']);
});
test('custom titles can be created, selected and renamed along with all assigned people', async () => {
  const created = await service.saveGroup(null, { title: 'Advisory Committee', description: 'Advisors', sequence: 3, status: 'active' });
  assert.equal(await service.validateMemberGroup('advisory committee'), 'Advisory Committee');
  members.push({ id: 2, group_name: created.title, name: 'Advisor', status: 'active', photo_url: '/uploads/advisor.webp' });
  await service.saveGroup(created.id, { title: 'Community Advisors', description: 'Updated', sequence: 4, status: 'active' });
  assert.equal(members[1].group_name, 'Community Advisors');
  assert.equal(members[1].photo_url, '/uploads/advisor.webp');
  assert.equal((await service.getGroups({ status: 'active', include_members: 'true' })).find(group => group.id === created.id).members[0].name, 'Advisor');
});
test('duplicate titles reject renames without changing group or member data', async () => {
  await service.getGroups(); const original = structuredClone({ groups, members });
  await assert.rejects(service.saveGroup(groups[1].id, { title: 'Board of Directors', sequence: 2, status: 'active' }), /already exists/);
  assert.deepEqual({ groups, members }, original);
});
test('inactive groups disappear publicly and cannot receive new assignments, while existing profiles stay editable', async () => {
  await service.getGroups(); const group = groups.find(group => group.title === 'Leadership');
  await service.saveGroup(group.id, { ...group, status: 'inactive' });
  assert.deepEqual(await service.getGroups({ status: 'active', include_members: 'true' }).then(result => result.flatMap(group => group.members)), []);
  await assert.rejects(service.validateMemberGroup('Leadership'), /inactive/);
  assert.equal(await service.validateMemberGroup('Leadership', 'Leadership'), 'Leadership');
  await assert.rejects(service.validateMemberGroup('Unregistered Group'), /Select a group/);
});
test('deleting a group with active or inactive members is rejected; empty groups can be removed', async () => {
  await service.getGroups(); members[0].status = 'inactive';
  const inUse = groups.find(group => group.title === 'Leadership');
  await assert.rejects(service.deleteGroup(inUse.id), /Move this group/);
  assert.equal(members.length, 1);
  const empty = groups.find(group => group.title === 'Board of Directors');
  await service.deleteGroup(empty.id);
  assert.equal(groups.some(group => group.id === empty.id), false);
  await service.getGroups(); assert.equal(groups.some(group => group.id === empty.id), false);
});
