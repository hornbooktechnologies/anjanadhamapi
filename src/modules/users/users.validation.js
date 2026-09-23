const Joi = require("joi");

const assignRoles = Joi.object({
  roleIds: Joi.array().items(Joi.number().integer().required()).required(),
});

const createUser = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(50).required(),
  roleIds: Joi.array().items(Joi.number().integer().required()).optional(),
  status: Joi.string().valid("active", "inactive", "suspended").optional(),
});

const updateUser = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(50).optional().allow(null, ""),
  roleIds: Joi.array().items(Joi.number().integer().required()).optional(),
  status: Joi.string().valid("active", "inactive", "suspended").required(),
});

const updateStatus = Joi.object({
  status: Joi.string().valid("active", "inactive", "suspended").required(),
});

module.exports = {
  assignRoles,
  createUser,
  updateUser,
  updateStatus,
};
