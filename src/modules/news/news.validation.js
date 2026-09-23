const Joi = require("joi");

const saveCategory = Joi.object({
  category_title: Joi.string().required().messages({
    "string.empty": "Category Title is required",
  }),
  sequence: Joi.number().integer().default(0).messages({
    "number.base": "Sequence must be a number",
  }),
  status: Joi.string().valid("active", "inactive").default("active"),
});

const saveNewsContent = Joi.object({
  category_id: Joi.number().integer().required().messages({
    "number.base": "Category ID is required",
  }),
  title: Joi.string().required().messages({
    "string.empty": "Title is required",
  }),
  date: Joi.date().required().messages({
    "date.base": "Date is required and must be a valid date",
  }),
  short_description: Joi.string().required().messages({
    "string.empty": "Short Description is required",
  }),
  image_url: Joi.string().required().messages({
    "string.empty": "Image Upload is required",
  }),
  image_alt: Joi.string().required().messages({
    "string.empty": "Image Alt Text is required",
  }),
  logo_url: Joi.string().allow("", null).optional(),
  logo_alt: Joi.string().allow("", null).optional(),
  external_url: Joi.string().uri().allow("", null).optional().messages({
    "string.uri": "External URL must be a valid URL format",
  }),
  featured_homepage: Joi.number().valid(0, 1).default(0),
  featured_listing: Joi.number().valid(0, 1).default(0),
  publish_status: Joi.string().valid("draft", "published").default("draft"),
  sequence: Joi.number().integer().default(0).messages({
    "number.base": "Sequence must be a number",
  }),
});

module.exports = {
  saveCategory,
  saveNewsContent,
};
