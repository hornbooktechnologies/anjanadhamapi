const Joi = require("joi");

const createPermission = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  module: Joi.string().min(2).max(100).required(),
});

const updatePermission = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  module: Joi.string().min(2).max(100).required(),
});

module.exports = {
  createPermission,
  updatePermission,
};
