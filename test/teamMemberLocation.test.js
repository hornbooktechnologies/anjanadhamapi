const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
let members, locationExists, alterations, service, groups;
const dbPath = require.resolve('../src/config/database');
const groupPath = require.resolve('../src/modules/team/team-groups.service');
const servicePath = require.resolve('../src/modules/team/team.service');
async function query(input, values = []) {
  const sql = input.replace(/\s+/g, ' ').trim();
  if (sql.includes('information_schema.TABLES')) return [{ count: 1 }];
  if (sql.includes('information_schema.COLUMNS')) return sql.includes("COLUMN_NAME = 'location'") ? [{ count: Number(locationExists) }] : [{ COLUMN_TYPE: 'varchar(255)' }];
  if (sql.startsWith('ALTER TABLE')) { locationExists = true; alterations++; return {}; }
  if (sql.startsWith('CREATE TABLE') || sql.startsWith('INSERT IGNORE')) return {};
  if (sql.startsWith('SELECT * FROM team_groups')) return [{ id: 1, title: 'Leadership', status: 'active' }];
  if (sql.startsWith('SELECT g.*')) return [{ id: 1, title: 'Leadership', status: 'active' }];
  if (sql.startsWith('SELECT m.*')) return structuredClone(members);
  if (sql.startsWith('INSERT INTO team_members')) {
    const columns = sql.match(/\(([^)]+)\)/)[1].split(',').map(value => value.trim());
    const member = { id: members.length + 1 };
    columns.forEach((column, i) => { member[column] = values[i]; });
    members.push(member); return { insertId: member.id };
  }
  if (sql.startsWith('SELECT * FROM team_members WHERE id')) return members.filter(member => member.id === Number(values[0])).map(member => ({ ...member }));
  if (sql.startsWith('SELECT COUNT(*)')) return [{ total: members.length }];
  if (sql.startsWith('SELECT * FROM team_members')) return structuredClone(members);
  if (sql.startsWith('UPDATE team_members')) {
    const member = members.find(member => member.id === Number(values.at(-1)));
    sql.split('SET ')[1].split(' WHERE')[0].split(',').forEach((assignment, i) => { member[assignment.split('=')[0].trim()] = values[i]; });
    return { affectedRows: 1 };
  }
  throw new Error(`Unexpected isolated SQL: ${sql}`);
}
function stub(relative, exports) {
  const filename = require.resolve(relative);
  require.cache[filename] = { id: filename, filename, loaded: true, exports };
}
stub('../src/config/database', { query });
stub('../src/utils/profileCleanup', { changeProfileWithCleanup: query });
stub('../src/utils/fileUpload', { deleteStoredFile: () => {} });
stub('../src/utils/sequence', { getNextSequence: async () => 1 });
const { saveTeamMember } = require('../src/modules/team/team.validation');
const profile = { group_name: 'Leadership', name: 'Person', designation: 'Coordinator', photo_url: '/uploads/existing.webp', photo_alt: 'Person portrait', status: 'active', sequence: 1 };
beforeEach(() => {
  members = []; locationExists = false; alterations = 0;
  delete require.cache[groupPath]; delete require.cache[servicePath];
  groups = require(groupPath); service = require(servicePath);
});

test('location is validated, saved and returned by member and public group reads', async () => {
  const validated = saveTeamMember.validate({ ...profile, location: '  Ahmedabad, Gujarat  ' });
  assert.equal(validated.error, undefined);
  const created = await service.createMember(validated.value);
  assert.equal(created.location, 'Ahmedabad, Gujarat');
  assert.equal((await service.getMemberById(created.id)).location, created.location);
  assert.equal((await service.getMembers()).data[0].location, created.location);
  assert.equal((await groups.getGroups({ include_members: 'true' }))[0].members[0].location, created.location);
  assert.equal(alterations, 1);
});
test('editing and clearing a location preserves the original photo and stored legacy LinkedIn value', async () => {
  members.push({ id: 1, ...profile, location: 'Old city', linkedin_url: 'https://linkedin.com/in/existing' });
  await service.updateMember(1, { ...profile, location: '  Surat  ' });
  assert.equal(members[0].location, 'Surat');
  assert.equal(members[0].linkedin_url, 'https://linkedin.com/in/existing');
  assert.equal(members[0].photo_url, profile.photo_url);
  await service.updateMember(1, { ...profile, location: null });
  assert.equal(members[0].location, null);
});
test('older clients that omit location retain an existing location; new blank profiles stay null', async () => {
  members.push({ id: 1, ...profile, location: 'Palanpur' });
  await service.updateMember(1, profile);
  assert.equal(members[0].location, 'Palanpur');
  const created = await service.createMember(profile);
  assert.equal(created.location, null);
  assert.equal(saveTeamMember.validate({ ...profile, location: 'x'.repeat(256) }).error.details[0].path[0], 'location');
});
test('databases with a location column skip the additive schema update', async () => {
  locationExists = true;
  await Promise.all([service.getMembers(), groups.getGroups()]);
  assert.equal(alterations, 0);
});
