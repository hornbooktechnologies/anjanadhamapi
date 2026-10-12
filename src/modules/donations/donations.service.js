const crypto = require('node:crypto');
const env = require('../../config/env');
const AppError = require('../../utils/AppError');

function getConfig() {
  const enabled = Boolean(env.razorpay.keyId && env.razorpay.keySecret);
  return { enabled };
}

function sign(value) {
  if (!getConfig().enabled) throw new AppError('Secure checkout is not configured.', 503);
  return crypto.createHmac('sha256', env.razorpay.keySecret).update(value).digest('hex');
}

function signaturesMatch(actual, expected) {
  return typeof actual === 'string' && /^[a-f0-9]{64}$/i.test(actual)
    && crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
}

async function request(path, body) {
  if (!getConfig().enabled) throw new AppError('Secure checkout is not configured.', 503);
  let response;
  try {
    response = await fetch(`https://api.razorpay.com/v1/${path}`, {
      method: body ? 'POST' : 'GET',
      headers: {
        Authorization: `Basic ${Buffer.from(`${env.razorpay.keyId}:${env.razorpay.keySecret}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(12000),
    });
  } catch { throw new AppError('Unable to reach Razorpay. Please try again shortly.', 503); }
  if (!response.ok) throw new AppError('Razorpay could not complete this request. Please check your payment status before retrying.', 502);
  return response.json();
}

async function createOrder(rupees) {
  const amount = Math.round(rupees * 100);
  if (!Number.isSafeInteger(amount) || amount < 100 || amount > 9999999900 || Math.abs(rupees * 100 - amount) > 0.00001) {
    throw new AppError('Enter a valid donation amount with at most two decimal places.', 400);
  }
  const order = await request('orders', { amount, currency: 'INR', partial_payment: false,
    receipt: `donation_${crypto.randomUUID().replaceAll('-', '').slice(0, 24)}` });
  if (!/^order_[A-Za-z0-9]+$/.test(order.id) || order.amount !== amount || order.currency !== 'INR') throw new AppError('Unable to prepare your donation.', 502);
  const expires = Date.now() + 60 * 60 * 1000;
  // Bind the payment to the server-created order and amount without trusting client values.
  const proof = sign(`donation|${order.id}|${amount}|${expires}`);
  return { order_id: order.id, amount, currency: 'INR', key_id: env.razorpay.keyId, expires, proof };
}

async function verifyPayment(data) {
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature, amount, expires, proof } = data;
  if (expires <= Date.now() || expires > Date.now() + 60 * 60 * 1000 || !signaturesMatch(proof, sign(`donation|${orderId}|${amount}|${expires}`))) {
    throw new AppError('The payment verification details are invalid or expired. Please contact the trust if you were charged.', 400);
  }
  if (!signaturesMatch(signature, sign(`${orderId}|${paymentId}`))) throw new AppError('Payment signature could not be verified.', 400);
  let payment = await request(`payments/${paymentId}`);
  const matchesOrder = value => value.id === paymentId && value.order_id === orderId && value.amount === amount && value.currency === 'INR';
  if (!matchesOrder(payment)) throw new AppError('Payment does not match this donation.', 400);
  if (payment.status === 'authorized') {
    try { payment = await request(`payments/${paymentId}/capture`, { amount, currency: 'INR' }); }
    catch { payment = await request(`payments/${paymentId}`); }
  }
  if (!matchesOrder(payment) || payment.status !== 'captured') {
    return { status: payment.status === 'failed' ? 'failed' : 'pending', paymentId };
  }
  return { status: 'success', paymentId };
}

module.exports = { getConfig, createOrder, verifyPayment };
