const Joi = require("joi");

const translationSchema = Joi.object({
  hi: Joi.object().pattern(Joi.string(), Joi.string().allow("", null)).default({}),
  gu: Joi.object().pattern(Joi.string(), Joi.string().allow("", null)).default({}),
}).optional();

const createFacilitySchema = Joi.object({
  title: Joi.string().trim().required().messages({
    "string.empty": "Title is required",
    "any.required": "Title is required",
  }),
  category: Joi.string().trim().allow("", null).optional(),
  short_description: Joi.string().trim().allow("", null).optional(),
  description: Joi.string().trim().allow("", null).optional(),
  metric: Joi.string().trim().allow("", null).optional(),
  image_url: Joi.string().trim().allow("", null).optional(),
  image_alt: Joi.string().trim().allow("", null).optional(),
  sequence: Joi.number().integer().min(0).allow(null).optional(),
  status: Joi.string().valid("active", "inactive").default("active"),
  translations: translationSchema,
});

const updateFacilitySchema = Joi.object({
  title: Joi.string().trim().allow("", null).optional(),
  category: Joi.string().trim().allow("", null).optional(),
  short_description: Joi.string().trim().allow("", null).optional(),
  description: Joi.string().trim().allow("", null).optional(),
  metric: Joi.string().trim().allow("", null).optional(),
  image_url: Joi.string().trim().allow("", null).optional(),
  image_alt: Joi.string().trim().allow("", null).optional(),
  sequence: Joi.number().integer().min(0).allow(null).optional(),
  status: Joi.string().valid("active", "inactive").optional(),
  translations: translationSchema,
});

module.exports = {
  createFacilitySchema,
  updateFacilitySchema,
};
