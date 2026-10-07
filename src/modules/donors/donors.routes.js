const express = require('express');
const Joi = require('joi');
const service = require('./donors.service');
const asyncHandler = require('../../utils/asyncHandler');
const { successResponse } = require('../../utils/response');
const validate = require('../../middlewares/validate.middleware');
const auth = require('../../middlewares/auth.middleware');
const permission = require('../../middlewares/permission.middleware');
const router = express.Router();
const date = Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).custom((value, helpers) => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0,10) !== value ? helpers.error('any.invalid') : value;
});
const schema = Joi.object({
  name: Joi.string().trim().max(255).required(),
  location: Joi.string().trim().max(255).allow('', null).default(''),
  amount: Joi.number().positive().max(999999999999.99).precision(2).required(),
  initiative: Joi.string().trim().max(255).allow('', null).default(''),
  contribution_date: date.required(),
  photo_url: Joi.string().max(2048).pattern(/^(\/uploads\/|https?:\/\/|\/images\/)/).allow('', null).default(''),
  photo_alt: Joi.string().trim().max(255).allow('', null).default(''),
  status: Joi.string().valid('active', 'inactive').default('active'),
  translations: Joi.object({ hi: Joi.object().pattern(Joi.string().valid('name','location','initiative','photo_alt'), Joi.string().allow('',null)), gu: Joi.object().pattern(Joi.string().valid('name','location','initiative','photo_alt'), Joi.string().allow('',null)) }).optional(),
});
router.get('/', asyncHandler(async (req,res) => successResponse(res, 'Donors fetched', await service.getDonors({ ...req.query, status: 'active' }))));
router.use(auth);
router.get('/manage', permission('donors.view'), asyncHandler(async (req,res) => successResponse(res, 'Donors fetched', await service.getDonors(req.query))));
router.get('/:id', permission('donors.view'), asyncHandler(async (req,res) => successResponse(res, 'Donor fetched', await service.getDonor(req.params.id, req.query.lang))));
router.post('/', permission('donors.create'), validate(schema), asyncHandler(async (req,res) => successResponse(res, 'Donor created', await service.saveDonor(null, req.body), 201)));
router.put('/:id', permission('donors.update'), validate(schema), asyncHandler(async (req,res) => successResponse(res, 'Donor updated', await service.saveDonor(req.params.id, req.body))));
router.delete('/:id', permission('donors.delete'), asyncHandler(async (req,res) => { await service.removeDonor(req.params.id); return successResponse(res, 'Donor deleted'); }));
module.exports = router;
