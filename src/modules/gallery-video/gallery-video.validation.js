const Joi = require("joi");

const translationSchema = Joi.object({
  hi: Joi.object().pattern(Joi.string(), Joi.string().allow("", null)).default({}),
  gu: Joi.object().pattern(Joi.string(), Joi.string().allow("", null)).default({}),
}).optional();

const createGalleryVideoSchema = Joi.object({
  title: Joi.string().trim().required().messages({
    "string.empty": "Title is required",
    "any.required": "Title is required",
  }),
  description: Joi.string().trim().allow("", null).optional(),
  video_url: Joi.string().trim().required().messages({
    "string.empty": "Video URL / file is required",
    "any.required": "Video URL / file is required",
  }),
  thumbnail_url: Joi.string().trim().allow("", null).optional(),
  sequence: Joi.number().integer().optional(),
  status: Joi.string().valid("active", "inactive").default("active"),
  translations: translationSchema,
});

const updateGalleryVideoSchema = Joi.object({
  title: Joi.string().trim().required().messages({
    "string.empty": "Title is required",
    "any.required": "Title is required",
  }),
  description: Joi.string().trim().allow("", null).optional(),
  video_url: Joi.string().trim().required().messages({
    "string.empty": "Video URL / file is required",
    "any.required": "Video URL / file is required",
  }),
  thumbnail_url: Joi.string().trim().allow("", null).optional(),
  sequence: Joi.number().integer().optional(),
  status: Joi.string().valid("active", "inactive").default("active"),
  translations: translationSchema,
});

module.exports = {
  createGalleryVideoSchema,
  updateGalleryVideoSchema,
};

