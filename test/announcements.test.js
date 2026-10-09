const { before, after, beforeEach, test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp, reset, state } = require('./support/announcementFixture');
let server, base;
before(async () => { server = createApp().listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve)); base = `http://127.0.0.1:${server.address().port}/api/news`; });
after(() => new Promise(resolve => server.close(resolve)));
beforeEach(reset);
async function request(path = '', { method = 'GET', data, token = 'admin' } = {}) {
  const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(data ? { body: JSON.stringify(data) } : {}) });
  return { status: response.status, body: await response.json() };
}
const notice = { category_id: 1, title: 'Campus notice', date: '2026-01-01', short_description: 'Details from admin.', publish_status: 'draft' };
test('text-only create, publish, edit, unpublish and delete drive the anonymous feed', async () => {
  const created = await request('', { method: 'POST', data: notice });
  assert.equal(created.status, 201); const id = created.body.data.id;
  assert.equal((await request('/public', { token: null })).body.data.length, 0);
  assert.equal((await request(`/${id}/publish`, { method: 'PATCH' })).status, 200);
  assert.equal((await request('/public', { token: null })).body.data[0].title, notice.title);
  assert.equal((await request(`/${id}`, { method: 'PUT', data: { ...notice, title: 'Updated from admin', publish_status: 'published' } })).status, 200);
  assert.equal((await request('/public', { token: null })).body.data[0].title, 'Updated from admin');
  await request(`/${id}/publish`, { method: 'PATCH' });
  assert.equal((await request('/public', { token: null })).body.data.length, 0);
  await request(`/${id}`, { method: 'DELETE' }); assert.equal(state.notices.length, 0);
});
test('drafts, inactive categories and future notices stay hidden even when requested in query filters', async () => {
  for (const data of [{ ...notice, publish_status: 'published' }, { ...notice, title: 'Draft' }, { ...notice, title: 'Scheduled', date: '2099-01-01', publish_status: 'published' }]) await request('', { method: 'POST', data });
  state.notices.push({ id: 100, ...notice, category_id: 2, publish_status: 'published' });
  const result = await request('/public?publish_status=draft&category_status=inactive&endDate=2099-12-31', { token: null });
  assert.equal(result.status, 200); assert.deepEqual(result.body.data.map(row => row.title), ['Campus notice']);
});
test('latest-first ordering, bounded pagination and equal-date tie order', async () => {
  for (const date of ['2026-01-01', '2026-02-01', '2026-02-01', '2026-03-01']) await request('', { method: 'POST', data: { ...notice, date, publish_status: 'published' } });
  const result = await request('/public?limit=2&page=1', { token: null });
  assert.deepEqual(result.body.data.map(row => row.id), [4, 3]); assert.equal(result.body.pagination.last_page, 2);
  assert.deepEqual((await request('/public?limit=2&page=2', { token: null })).body.data.map(row => row.id), [2, 1]);
  assert.equal((await request('/public?limit=9999', { token: null })).body.pagination.per_page, 100);
});
test('draft reads and writes need authorization; editors cannot publish or unpublish', async () => {
  for (const path of ['', '/categories', '/1']) assert.equal((await request(path, { token: null })).status, 401);
  assert.equal((await request('', { method: 'POST', data: notice, token: null })).status, 401);
  assert.equal((await request('', { method: 'POST', data: notice, token: 'viewer' })).status, 403);
  assert.equal((await request('', { method: 'POST', data: { ...notice, publish_status: 'published' }, token: 'editor' })).status, 403);
  const created = await request('', { method: 'POST', data: { ...notice, publish_status: 'published' } });
  assert.equal((await request(`/${created.body.data.id}`, { method: 'PUT', data: notice, token: 'editor' })).status, 403);
});
test('unsafe links and invalid categories cannot be saved', async () => {
  assert.equal((await request('', { method: 'POST', data: { ...notice, external_url: 'javascript:alert(1)' } })).status, 400);
  assert.equal((await request('', { method: 'POST', data: { ...notice, category_id: 2 } })).status, 400);
  assert.equal((await request('', { method: 'POST', data: { ...notice, title: ' ' } })).status, 400);
  assert.equal(state.notices.length, 0);
});

test('IST schedule stays hidden before the exact instant and appears at it regardless of server timezone', async t => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-08T18:29:59Z').getTime() });
  const created = await request('', { method: 'POST', data: { ...notice, date: '2026-10-09', publish_time: '00:00', publish_status: 'published' } });
  assert.equal(created.status, 201);
  assert.equal(created.body.data.publish_at, '2026-10-08T18:30:00Z');
  assert.equal(created.body.data.publish_time, '00:00');
  assert.equal(created.body.data.publication_state, 'scheduled');
  assert.equal((await request('/public', { token: null })).body.data.length, 0);
  assert.equal((await request('?publish_status=scheduled')).body.data.length, 1);
  assert.equal((await request('?publish_status=published')).body.data.length, 0);
  t.mock.timers.tick(1000);
  assert.equal((await request('/public', { token: null })).body.data[0].id, created.body.data.id);
  assert.equal((await request('?publish_status=scheduled')).body.data.length, 0);
  assert.equal((await request('?publish_status=published')).body.data[0].publication_state, 'published');
});
test('schedule time round-trips through edits, canceling stays hidden and legacy clients preserve time', async t => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-08T03:59:59Z').getTime() });
  const data = { ...notice, date: '2026-10-08', publish_time: '09:30', publish_status: 'published' };
  const created = await request('', { method: 'POST', data }); const id = created.body.data.id;
  assert.equal(created.body.data.publish_at, '2026-10-08T04:00:00Z');
  const read = await request(`/${id}`); assert.equal(read.body.data.publish_time, '09:30');
  const edited = await request(`/${id}`, { method: 'PUT', data: { ...data, publish_time: '10:00' } });
  assert.equal(edited.body.data.publish_at, '2026-10-08T04:30:00Z');
  const { publish_time, ...legacy } = data;
  assert.equal((await request(`/${id}`, { method: 'PUT', data: legacy })).body.data.publish_time, '10:00');
  assert.equal((await request(`/${id}`, { method: 'PUT', data: { ...data, publish_time: '10:05' }, token: 'editor' })).status, 403);
  await request(`/${id}/publish`, { method: 'PATCH' });
  t.mock.timers.tick(60 * 60 * 1000);
  assert.equal((await request('/public', { token: null })).body.data.length, 0);
});
test('same-day notices sort by exact publish time; invalid times cannot be saved', async () => {
  for (const publish_time of ['11:00', '09:30', '10:00']) await request('', { method: 'POST', data: { ...notice, publish_time, publish_status: 'published' } });
  assert.deepEqual((await request('/public', { token: null })).body.data.map(row => row.publish_time), ['11:00', '10:00', '09:30']);
  for (const publish_time of ['24:00', '09:60', '9:30', '09:30Z']) assert.equal((await request('', { method: 'POST', data: { ...notice, publish_time } })).status, 400);
});
test('drafts need no date or time and immediate publication uses the save instant in IST', async t => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-08T18:40:37Z').getTime() });
  const { date, ...withoutDate } = notice;
  const draft = await request('', { method: 'POST', data: withoutDate });
  assert.equal(draft.status, 201);
  assert.equal((await request('/public', { token: null })).body.data.length, 0);
  const published = await request(`/${draft.body.data.id}`, { method: 'PUT', data: { ...withoutDate, publish_status: 'published', publish_immediately: true } });
  assert.equal(published.body.data.date, '2026-10-09');
  assert.equal(published.body.data.publish_at, '2026-10-08T18:40:37Z');
  assert.equal((await request('/public', { token: null })).body.data.length, 1);
  t.mock.timers.tick(60000);
  const edited = await request(`/${draft.body.data.id}`, { method: 'PUT', data: { ...withoutDate, title: 'Edited public notice', publish_status: 'published', publish_immediately: true } });
  assert.equal(edited.body.data.publish_at, published.body.data.publish_at);
  const blank = await request('', { method: 'POST', data: { ...withoutDate, date: '', publish_time: '', publish_status: 'published' } });
  assert.equal(blank.status, 201); assert.equal(blank.body.data.publication_state, 'published');
});
test('date-only and time-only scheduling use midnight and today in IST', async t => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-08T18:40:37Z').getTime() });
  const dateOnly = await request('', { method: 'POST', data: { ...notice, date: '2026-10-10', publish_time: '', publish_status: 'published' } });
  assert.equal(dateOnly.body.data.publish_at, '2026-10-09T18:30:00Z');
  const timeOnly = await request('', { method: 'POST', data: { ...notice, date: '', publish_time: '09:30', publish_status: 'published' } });
  assert.equal(timeOnly.body.data.date, '2026-10-09');
  assert.equal(timeOnly.body.data.publish_at, '2026-10-09T04:00:00Z');
  assert.equal((await request('/public', { token: null })).body.data.length, 0);
});
test('switching a scheduled notice to immediate requires publish permission and list publish ignores old draft timing', async t => {
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-08T04:00:00Z').getTime() });
  const future = { ...notice, date: '2099-01-01', publish_status: 'published' };
  const created = await request('', { method: 'POST', data: future }); const id = created.body.data.id;
  const { date, ...immediate } = future;
  immediate.publish_immediately = true;
  assert.equal((await request(`/${id}`, { method: 'PUT', data: immediate, token: 'editor' })).status, 403);
  assert.equal((await request(`/${id}`, { method: 'PUT', data: immediate })).body.data.publish_at, '2026-10-08T04:00:00Z');
  await request(`/${id}/publish`, { method: 'PATCH' });
  const draft = await request(`/${id}`, { method: 'PUT', data: { ...future, publish_time: '', publish_status: 'draft' } });
  assert.equal(draft.body.data.publish_at, '2098-12-31T18:30:00Z');
  await request(`/${id}/publish`, { method: 'PATCH' });
  assert.equal((await request(`/${id}`)).body.data.publish_at, '2026-10-08T04:00:00Z');
  assert.equal((await request('/public', { token: null })).body.data.length, 1);
});
