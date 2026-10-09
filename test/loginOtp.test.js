const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const express = require('express');

// Isolated login flow: no live database, users or SMTP messages are touched.
const env = { nodeEnv: 'development', otp: { logToConsole: true, recipientEmail: 'reviewer@example.test' },
  jwt: { secret: 'isolated-access-secret', expiry: '15m', refreshSecret: 'isolated-refresh-secret', refreshExpiry: '7d' } };
function mockModule(filename, exports) {
  const id = require.resolve(filename);
  require.cache[id] = { id, filename: id, loaded: true, exports };
}
mockModule('../src/config/env', env);
let user, otpRows, mail;
async function query(sql, params = []) {
  if (sql.includes('FROM login_otps lo')) {
    const row = otpRows.filter(row => !row.verified_at && params[0] === user.email).at(-1);
    return row ? [{ ...row, user_id: user.id, name: user.name, email: user.email, status: user.status }] : [];
  }
  if (sql.includes('FROM users u')) return params[0] === user.email ? [user] : [];
  if (sql.startsWith('UPDATE login_otps SET verified_at')) {
    if (sql.includes('user_id =')) for (const row of otpRows) row.verified_at = new Date();
    else otpRows.find(row => row.id === params[0]).verified_at = new Date();
    return {};
  }
  if (sql.startsWith('INSERT INTO login_otps')) {
    otpRows.push({ id: otpRows.length + 1, otp_hash: params[1], expires_at: params[2], attempts: 0, verified_at: null }); return {};
  }
  if (sql.startsWith('UPDATE login_otps SET attempts')) { otpRows.find(row => row.id === params[0]).attempts++; return {}; }
  throw new Error(`Unexpected isolated query: ${sql}`);
}
mockModule('../src/config/database', { query, transaction: callback => callback({ execute: async (...args) => [await query(...args)] }) });
mockModule('../src/utils/mailer', { sendMail: async options => { mail.push(options); } });
const controller = require('../src/modules/auth/auth.controller');
const app = express(); app.use(express.json());
app.post('/login', (req,res,next) => controller.login(req,res).catch(next));
app.post('/verify', (req,res,next) => controller.verifyLoginOtp(req,res).catch(next));
app.use((error, _req, res, _next) => res.status(error.statusCode || 500).json({ message: error.message }));
const password = 'Only-for-isolated-tests-123';
beforeEach(async () => {
  user = { id: 1, name: 'Test admin', email: 'admin@example.test', password: await bcrypt.hash(password, 4), status: 'active' };
  otpRows = []; mail = []; env.nodeEnv = 'development'; env.otp.logToConsole = true; delete process.env.VERCEL;
});
async function request(t, route, body) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => server.close());
  const logs = [], previousLog = console.log;
  console.log = (...args) => logs.push(args);
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${route}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { status: response.status, body: await response.json(), logs };
  } finally { console.log = previousLog; }
}
const credentials = () => ({ email: user.email, password });

test('valid credentials email the OTP and log the same code locally without exposing it in the response', async t => {
  const result = await request(t, '/login', credentials());
  assert.equal(result.status, 200); assert.equal(result.body.data.requiresOtp, true);
  assert.equal(result.body.message, 'OTP sent to assigned Super Admin'); assert.equal('delivery' in result.body.data, false);
  const code = result.logs.find(line => line[0] === 'OTP:')[1];
  assert.match(code, /^\d{6}$/); assert.equal(await bcrypt.compare(code, otpRows[0].otp_hash), true);
  assert.equal(JSON.stringify(result.body).includes(code), false); assert.equal(mail.length, 1);
  assert.equal(mail[0].to, env.otp.recipientEmail);
  assert.ok(mail[0].text.includes(`OTP: ${code}.`)); assert.ok(mail[0].html.includes(code));
  assert.equal(result.logs.some(line => JSON.stringify(line).includes(password)), false);
});
test('console OTP verifies successfully and signs in; the same OTP cannot be reused', async t => {
  const login = await request(t, '/login', credentials()); const code = login.logs.find(line => line[0] === 'OTP:')[1];
  const result = await request(t, '/verify', { email: user.email, otp: code });
  assert.equal(result.status, 200); assert.equal(result.body.data.user.id, user.id); assert.ok(result.body.data.token);
  assert.equal((await request(t, '/verify', { email: user.email, otp: code })).status, 400);
});
test('incorrect passwords generate no OTP, log no OTP and send no mail', async t => {
  const result = await request(t, '/login', { email: user.email, password: 'Wrong-password-123' });
  assert.equal(result.status, 401); assert.equal(otpRows.length, 0); assert.equal(result.logs.length, 0); assert.equal(mail.length, 0);
});
test('inactive accounts cannot request an OTP', async t => {
  user.status = 'inactive'; const result = await request(t, '/login', credentials());
  assert.equal(result.status, 403); assert.equal(otpRows.length, 0); assert.equal(result.logs.length, 0);
});
test('production emails the OTP without adding console logs', async t => {
  env.nodeEnv = 'production'; const result = await request(t, '/login', credentials());
  assert.equal(result.status, 200); assert.equal(result.body.message, 'OTP sent to assigned Super Admin'); assert.equal(result.logs.length, 0);
  assert.equal(mail.length, 1); assert.equal(mail[0].to, env.otp.recipientEmail);
});
test('Vercel deployments email the OTP without adding console logs', async t => {
  process.env.VERCEL = '1'; const result = await request(t, '/login', credentials());
  assert.equal(result.body.data.requiresOtp, true); assert.equal(result.logs.length, 0); assert.equal(mail.length, 1);
});
test('disabling local console logging leaves normal email delivery working', async t => {
  env.otp.logToConsole = false; const result = await request(t, '/login', credentials());
  assert.equal(result.body.data.requiresOtp, true); assert.equal(result.logs.length, 0); assert.equal(mail.length, 1);
});
test('expired console OTP is rejected', async t => {
  const login = await request(t, '/login', credentials()); const code = login.logs.find(line => line[0] === 'OTP:')[1];
  otpRows[0].expires_at = new Date(0);
  assert.equal((await request(t, '/verify', { email: user.email, otp: code })).status, 400);
});
