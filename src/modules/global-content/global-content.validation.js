const Joi = require("joi");

const schemaEntry = Joi.object({
  schema_type: Joi.string().allow("", null),
  schema_json: Joi.alternatives().try(Joi.string(), Joi.object(), Joi.array()).allow("", null),
});

const saveSeo = Joi.object({
  page: Joi.string().required(),
  meta_title: Joi.string().allow("", null),
  meta_description: Joi.string().allow("", null),
  canonical_url: Joi.string().allow("", null),
  robots_tag: Joi.string().allow("", null),
  og_title: Joi.string().allow("", null),
  og_description: Joi.string().allow("", null),
  og_image: Joi.string().allow("", null),
  og_image_alt: Joi.string().allow("", null),
  twitter_title: Joi.string().allow("", null),
  twitter_description: Joi.string().allow("", null),
  twitter_image: Joi.string().allow("", null),
  twitter_image_alt: Joi.string().allow("", null),
  schema_type: Joi.string().allow("", null),
  schema_json: Joi.string().allow("", null),
  schema_entries: Joi.array().items(schemaEntry).optional(),
  status: Joi.string().valid("active", "inactive").default("active"),
});

const updateFooter = Joi.object({
  phone: Joi.string().allow("", null),
  email: Joi.string().email().allow("", null),
  address: Joi.string().allow("", null),
  footer_description: Joi.string().allow("", null),
  socialLinks: Joi.array().items(
    Joi.object({
      id: Joi.number().optional(),
      platform_name: Joi.string().trim().max(100).required(),
      icon_url: Joi.string().allow("", null),
      url: Joi.string().trim().max(255).uri({ scheme: ['http', 'https'] }).required(),
      alt_text: Joi.string().allow("", null),
      sequence: Joi.number().default(0),
      status: Joi.string().valid("active", "inactive").default("active"),
    })
  ).optional(),
});

const saveCertificate = Joi.object({
  title: Joi.string().required(),
  image_url: Joi.string().required(),
  image_alt: Joi.string().allow("", null),
  link: Joi.string().allow("", null),
  sequence: Joi.number().default(0),
  status: Joi.string().valid("active", "inactive").default("active"),
});

const saveInquiry = Joi.object({
  full_name: Joi.string().trim().min(2).max(255).required(),
  phone_number: Joi.string().trim().max(50).required(),
  email: Joi.string().trim().email().max(100).required(),
  inquiry_purpose: Joi.string().trim().max(100).required(),
  message: Joi.string().trim().max(5000).required(),
  page_url: Joi.string().trim().max(255).allow("", null),
});

const saveFaq = Joi.object({
  page: Joi.string().valid("home", "product-listing", "seller").required(),
  question: Joi.string().required(),
  answer: Joi.string().required(),
  sequence: Joi.number().default(0),
  status: Joi.string().valid("active", "inactive").default("active"),
});

const saveBanner = Joi.object({
  page: Joi.string().required(),
  title: Joi.string().required(),
  file_url: Joi.string().required(),
  alt_text: Joi.string().allow("", null),
  status: Joi.string().valid("active", "inactive").default("active"),
});

module.exports = {
  saveSeo,
  updateFooter,
  saveCertificate,
  saveInquiry,
  saveFaq,
  saveBanner,
};

