const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const env = require('../src/config/env');
const service = require('../src/modules/donations/donations.service');
const originalKeys = env.razorpay;
const originalFetch = global.fetch;
env.razorpay = { keyId: 'rzp_test_example', keySecret: 'test-secret' };
after(() => { env.razorpay = originalKeys; global.fetch = originalFetch; });
const sign = text => crypto.createHmac('sha256', env.razorpay.keySecret).update(text).digest('hex');
const verification = (changes = {}) => {
  const data = { razorpay_order_id: 'order_123', razorpay_payment_id: 'pay_123', amount: 250000, expires: Date.now() + 300000 };
  return { ...data, proof: sign(`donation|order_123|250000|${data.expires}`), razorpay_signature: sign('order_123|pay_123'), ...changes };
};
const payment = status => ({ id: 'pay_123', order_id: 'order_123', amount: 250000, currency: 'INR', status });

test('configuration never discloses either key and disabled checkout cannot create orders', async () => {
  assert.deepEqual(service.getConfig(), { enabled: true });
  const keys = env.razorpay; env.razorpay = {};
  try {
    assert.deepEqual(service.getConfig(), { enabled: false });
    await assert.rejects(service.createOrder(2500), { statusCode: 503 });
  } finally { env.razorpay = keys; }
});

test('orders use paise, unique receipts, no partial payments and server-signed amount proof', async () => {
  let receipts = [];
  global.fetch = async (url, options) => {
    assert.equal(url, 'https://api.razorpay.com/v1/orders');
    const body = JSON.parse(options.body);
    assert.equal(body.amount, 110050); assert.equal(body.currency, 'INR'); assert.equal(body.partial_payment, false);
    assert.ok(body.receipt.length <= 40); receipts.push(body.receipt);
    return { ok: true, json: async () => ({ id: 'order_123', amount: body.amount, currency: body.currency }) };
  };
  for (let i = 0; i < 2; i++) {
    const result = await service.createOrder(1100.50);
    assert.equal(result.proof, sign(`donation|order_123|110050|${result.expires}`));
    assert.equal(result.key_id, 'rzp_test_example');
    assert.equal(result.keySecret, undefined);
  }
  assert.equal(new Set(receipts).size, 2);
  for (const amount of [0, -1, Infinity, NaN, 1.234, 100000000]) await assert.rejects(service.createOrder(amount), { statusCode: 400 });
});

test('invalid signatures, altered orders or amounts and expired proofs cannot reach Razorpay', async () => {
  global.fetch = async () => { assert.fail('Invalid verification called Razorpay'); };
  for (const changes of [
    { razorpay_signature: '0'.repeat(64) }, { proof: '0'.repeat(64) }, { amount: 100 },
    { razorpay_order_id: 'order_other' }, { razorpay_payment_id: 'pay_other' }, { expires: Date.now() - 1 },
  ]) await assert.rejects(service.verifyPayment(verification(changes)), { statusCode: 400 });
});

test('captured payments succeed without recapture and authorized payments are captured once', async () => {
  for (const status of ['captured', 'authorized']) {
    const calls = [];
    global.fetch = async (url, options) => {
      calls.push(url);
      if (url.endsWith('/capture')) { assert.deepEqual(JSON.parse(options.body), { amount: 250000, currency: 'INR' }); }
      return { ok: true, json: async () => payment(url.endsWith('/capture') ? 'captured' : status) };
    };
    assert.deepEqual(await service.verifyPayment(verification()), { status: 'success', paymentId: 'pay_123' });
    assert.equal(calls.length, status === 'captured' ? 1 : 2);
  }
});

test('failed and unconfirmed payments never produce thank-you status', async () => {
  for (const status of ['failed', 'created', 'refunded']) {
    global.fetch = async () => ({ ok: true, json: async () => payment(status) });
    assert.equal((await service.verifyPayment(verification())).status, status === 'failed' ? 'failed' : 'pending');
  }
  for (const changes of [{ amount: 100 }, { order_id: 'order_other' }, { currency: 'USD' }]) {
    global.fetch = async () => ({ ok: true, json: async () => ({ ...payment('captured'), ...changes }) });
    await assert.rejects(service.verifyPayment(verification()), { statusCode: 400 });
  }
});

test('an automatic capture racing with verification is confirmed by refetching', async () => {
  let reads = 0;
  global.fetch = async url => url.endsWith('/capture') ? { ok: false } : { ok: true, json: async () => payment(++reads === 1 ? 'authorized' : 'captured') };
  assert.equal((await service.verifyPayment(verification())).status, 'success');
  assert.equal(reads, 2);
});

test('public routes keep config private and validate order and verification requests', async () => {
  const express = require('express');
  const app = express();
  app.use(express.json());
  app.use('/donations', require('../src/modules/donations/donations.routes'));
  app.use((error, req, res, next) => res.status(error.statusCode || 500).json({ success: false, message: error.message }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/donations`;
  try {
    const config = await originalFetch(`${base}/config`);
    assert.equal(config.headers.get('cache-control'), 'no-store');
    const body = await config.json();
    assert.deepEqual(body.data, { enabled: true });
    global.fetch = async () => { assert.fail('Invalid input reached Razorpay'); };
    for (const amount of ['2500', 0, -1, 1.234]) {
      const response = await originalFetch(`${base}/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount }) });
      assert.equal(response.status, 400);
    }
    const invalid = await originalFetch(`${base}/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...verification(), razorpay_payment_id: '../../other' }) });
    assert.equal(invalid.status, 400);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
