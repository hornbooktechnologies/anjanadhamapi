const Joi = require("joi");

const translationSchema = Joi.object({
  hi: Joi.object().pattern(Joi.string(), Joi.string().allow("", null)).default({}),
  gu: Joi.object().pattern(Joi.string(), Joi.string().allow("", null)).default({}),
}).optional();

const createBlogSchema = Joi.object({
  title: Joi.string().trim().required().messages({
    "string.empty": "Blog title is required",
    "any.required": "Blog title is required",
  }),
  category: Joi.string().trim().allow("", null).optional(),
  author: Joi.string().trim().allow("", null).optional(),
  publish_date: Joi.date().iso().allow("", null).optional(),
  read_time: Joi.string().trim().allow("", null).optional(),
  short_description: Joi.string().trim().allow("", null).optional(),
  description: Joi.string().trim().allow("", null).optional(),
  image_url: Joi.string().trim().allow("", null).optional(),
  image_alt: Joi.string().trim().allow("", null).optional(),
  meta_title: Joi.string().trim().max(255).allow("", null).optional(),
  meta_description: Joi.string().trim().max(1000).allow("", null).optional(),
  sequence: Joi.number().integer().min(0).allow(null).optional(),
  status: Joi.string().valid("active", "inactive").default("active"),
  translations: translationSchema,
});

const updateBlogSchema = Joi.object({
  title: Joi.string().trim().allow("", null).optional(),
  category: Joi.string().trim().allow("", null).optional(),
  author: Joi.string().trim().allow("", null).optional(),
  publish_date: Joi.date().iso().allow("", null).optional(),
  read_time: Joi.string().trim().allow("", null).optional(),
  short_description: Joi.string().trim().allow("", null).optional(),
  description: Joi.string().trim().allow("", null).optional(),
  image_url: Joi.string().trim().allow("", null).optional(),
  image_alt: Joi.string().trim().allow("", null).optional(),
  meta_title: Joi.string().trim().max(255).allow("", null).optional(),
  meta_description: Joi.string().trim().max(1000).allow("", null).optional(),
  sequence: Joi.number().integer().min(0).allow(null).optional(),
  status: Joi.string().valid("active", "inactive").optional(),
  translations: translationSchema,
});

module.exports = {
  createBlogSchema,
  updateBlogSchema,
};
