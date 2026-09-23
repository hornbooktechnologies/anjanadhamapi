const Joi = require("joi");

const translationSchema = Joi.object({
  hi: Joi.object().pattern(Joi.string(), Joi.string().allow("", null)).default({}),
  gu: Joi.object().pattern(Joi.string(), Joi.string().allow("", null)).default({}),
}).optional();

const createMediaCoverageSchema = Joi.object({
  title: Joi.string().trim().required().messages({
    "string.empty": "Title is required",
    "any.required": "Title is required",
  }),
  description: Joi.string().trim().allow("", null).optional(),
  media_type: Joi.string().valid("image", "video").optional().default("image"),
  media_url: Joi.string().trim().required().messages({
    "string.empty": "Media file is required",
    "any.required": "Media file is required",
  }),
  thumbnail_url: Joi.string().trim().allow("", null).optional(),
  media_name: Joi.string().trim().allow("", null).optional(),
  media_link: Joi.string().trim().allow("", null).optional(),
  sequence: Joi.number().integer().optional(),
  status: Joi.string().valid("active", "inactive").default("active"),
  translations: translationSchema,
});

const updateMediaCoverageSchema = Joi.object({
  title: Joi.string().trim().required().messages({
    "string.empty": "Title is required",
    "any.required": "Title is required",
  }),
  description: Joi.string().trim().allow("", null).optional(),
  media_type: Joi.string().valid("image", "video").optional(),
  media_url: Joi.string().trim().required().messages({
    "string.empty": "Media file is required",
    "any.required": "Media file is required",
  }),
  thumbnail_url: Joi.string().trim().allow("", null).optional(),
  media_name: Joi.string().trim().allow("", null).optional(),
  media_link: Joi.string().trim().allow("", null).optional(),
  sequence: Joi.number().integer().optional(),
  status: Joi.string().valid("active", "inactive").default("active"),
  translations: translationSchema,
});

module.exports = {
  createMediaCoverageSchema,
  updateMediaCoverageSchema,
};

