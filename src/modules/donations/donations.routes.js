const express = require('express');
const Joi = require('joi');
const rateLimit = require('express-rate-limit');
const validate = require('../../middlewares/validate.middleware');
const asyncHandler = require('../../utils/asyncHandler');
const { successResponse } = require('../../utils/response');
const service = require('./donations.service');
const router = express.Router();

router.use((req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
router.get('/config', (req, res) => successResponse(res, 'Checkout configuration', service.getConfig()));
router.use(rateLimit({ windowMs: 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false }));
router.post('/orders', validate(Joi.object({ amount: Joi.number().min(1).max(99999999).precision(2).strict().required() })), asyncHandler(async (req, res) => {
  return successResponse(res, 'Donation checkout ready', await service.createOrder(req.body.amount), 201);
}));
router.post('/verify', validate(Joi.object({
  razorpay_order_id: Joi.string().pattern(/^order_[A-Za-z0-9]+$/).required(),
  razorpay_payment_id: Joi.string().pattern(/^pay_[A-Za-z0-9]+$/).required(),
  razorpay_signature: Joi.string().hex().length(64).required(),
  amount: Joi.number().integer().min(100).max(9999999900).strict().required(),
  expires: Joi.number().integer().strict().required(),
  proof: Joi.string().hex().length(64).required(),
})), asyncHandler(async (req, res) => {
  return successResponse(res, 'Donation payment status', await service.verifyPayment(req.body));
}));

module.exports = router;
