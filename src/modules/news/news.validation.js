const Joi = require("joi");

const saveCategory = Joi.object({
  category_title: Joi.string().trim().max(255).required().messages({
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
  title: Joi.string().trim().max(255).required().messages({
    "string.empty": "Title is required",
  }),
  date: Joi.date().allow("", null).optional().messages({
    "date.base": "Date is required and must be a valid date",
  }),
  publish_time: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/).allow("", null).messages({
    "string.pattern.base": "Publish time must use HH:mm in India Standard Time",
    "string.empty": "Publish time is required",
  }),
  publish_immediately: Joi.boolean().optional(),
  short_description: Joi.string().trim().max(10000).required().messages({
    "string.empty": "Short Description is required",
  }),
  image_url: Joi.string().allow("").default(""),
  image_alt: Joi.string().trim().max(255).allow("").default(""),
  logo_url: Joi.string().allow("", null).optional(),
  logo_alt: Joi.string().allow("", null).optional(),
  external_url: Joi.string().trim().max(255).uri({ scheme: ["http", "https"] }).allow("", null).optional().messages({
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
