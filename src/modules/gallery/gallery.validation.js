const Joi = require("joi");

const translationSchema = Joi.object({
  hi: Joi.object().pattern(Joi.string(), Joi.string().allow("", null)).default({}),
  gu: Joi.object().pattern(Joi.string(), Joi.string().allow("", null)).default({}),
}).optional();

const galleryImageSchema = Joi.object({
  id: Joi.number().integer().optional(),
  image_url: Joi.string().trim().required().messages({
    "string.empty": "Image URL is required",
    "any.required": "Image URL is required",
  }),
  image_alt: Joi.string().trim().allow("", null).optional(),
  sequence: Joi.number().integer().optional().default(0),
});

const createGallerySchema = Joi.object({
  title: Joi.string().trim().required().messages({
    "string.empty": "Title is required",
    "any.required": "Title is required",
  }),
  description: Joi.string().trim().allow("", null).optional(),
  is_default: Joi.boolean().truthy(1, "1", "true").falsy(0, "0", "false").default(false),
  sequence: Joi.number().integer().optional(),
  status: Joi.string().valid("active", "inactive").default("active"),
  translations: translationSchema,
  images: Joi.array().items(galleryImageSchema).optional().default([]),
});

const updateGallerySchema = Joi.object({
  title: Joi.string().trim().required().messages({
    "string.empty": "Title is required",
    "any.required": "Title is required",
  }),
  description: Joi.string().trim().allow("", null).optional(),
  is_default: Joi.boolean().truthy(1, "1", "true").falsy(0, "0", "false").default(false),
  sequence: Joi.number().integer().optional(),
  status: Joi.string().valid("active", "inactive").default("active"),
  translations: translationSchema,
  images: Joi.array().items(galleryImageSchema).optional(),
});

module.exports = {
  createGallerySchema,
  updateGallerySchema,
};

