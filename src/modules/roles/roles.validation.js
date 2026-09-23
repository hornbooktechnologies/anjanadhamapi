const Joi = require("joi");

const createRole = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().max(255).allow(null, ""),
});

const updateRole = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().max(255).allow(null, ""),
});

const assignPermissions = Joi.object({
  permissionIds: Joi.array().items(Joi.number().integer().required()).required(),
});

module.exports = {
  createRole,
  updateRole,
  assignPermissions,
};
