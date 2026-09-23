const Joi = require("joi");

const translationSchema = Joi.object({
  hi: Joi.object().pattern(Joi.string(), Joi.string().allow("", null)).default({}),
  gu: Joi.object().pattern(Joi.string(), Joi.string().allow("", null)).default({}),
}).optional();

const createKeyMemberSchema = Joi.object({
  name: Joi.string().trim().required().messages({
    "string.empty": "Member name is required",
    "any.required": "Member name is required",
  }),
  designation: Joi.string().trim().allow("", null).optional(),
  location: Joi.string().trim().allow("", null).optional(),
  short_description: Joi.string().trim().allow("", null).optional(),
  description: Joi.string().trim().allow("", null).optional(),
  photo_url: Joi.string().trim().allow("", null).optional(),
  photo_alt: Joi.string().trim().allow("", null).optional(),
  sequence: Joi.number().integer().min(0).allow(null).optional(),
  status: Joi.string().valid("active", "inactive").default("active"),
  translations: translationSchema,
});

const updateKeyMemberSchema = Joi.object({
  name: Joi.string().trim().allow("", null).optional(),
  designation: Joi.string().trim().allow("", null).optional(),
  location: Joi.string().trim().allow("", null).optional(),
  short_description: Joi.string().trim().allow("", null).optional(),
  description: Joi.string().trim().allow("", null).optional(),
  photo_url: Joi.string().trim().allow("", null).optional(),
  photo_alt: Joi.string().trim().allow("", null).optional(),
  sequence: Joi.number().integer().min(0).allow(null).optional(),
  status: Joi.string().valid("active", "inactive").optional(),
  translations: translationSchema,
});

module.exports = {
  createKeyMemberSchema,
  updateKeyMemberSchema,
};

