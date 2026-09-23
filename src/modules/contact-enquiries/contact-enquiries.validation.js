const Joi = require("joi");

const submitContactEnquiry = Joi.object({
  full_name: Joi.string().trim().min(2).max(255).required(),
  phone_number: Joi.string().trim().max(50).required(),
  email: Joi.string().trim().email().max(100).required(),
  inquiry_purpose: Joi.string().trim().max(150).required(),
  message: Joi.string().trim().max(5000).required(),
  page_url: Joi.string().trim().max(255).allow("", null),
});

module.exports = {
  submitContactEnquiry,
};
