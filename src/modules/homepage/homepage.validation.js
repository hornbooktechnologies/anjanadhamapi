const Joi = require("joi");

const saveStat = Joi.object({
  value_text: Joi.string().trim().required().messages({
    "string.empty": "Value / Number is required",
    "any.required": "Value / Number is required",
  }),
  title: Joi.string().trim().required().messages({
    "string.empty": "Title is required",
    "any.required": "Title is required",
  }),
  description: Joi.string().allow("", null),
  icon_url: Joi.string().allow("", null),
  icon_alt: Joi.string().allow("", null),
  sequence: Joi.number().integer().min(0).default(0),
  status: Joi.string().valid("active", "inactive").default("active"),
});

const updateProcessSection = Joi.object({
  section_title: Joi.string().allow("", null),
  section_description: Joi.string().allow("", null),
});

const imageOnlyUrl = Joi.string().trim().required().custom((value, helpers) => {
  const normalized = value.toLowerCase().split("?")[0];
  const isImageData = normalized.startsWith("data:image/");
  const hasImageExtension = /\.(jpg|jpeg|png|webp|svg)$/.test(normalized);

  if (!isImageData && !hasImageExtension) {
    return helpers.message("Image upload must be an image file");
  }

  return value;
});

const saveProcessStep = Joi.object({
  step_title: Joi.string().trim().required().messages({
    "string.empty": "Step title is required",
    "any.required": "Step title is required",
  }),
  step_description: Joi.string().trim().required().messages({
    "string.empty": "Step description is required",
    "any.required": "Step description is required",
  }),
  file_url: imageOnlyUrl.messages({
    "string.empty": "Image upload is required",
    "any.required": "Image upload is required",
  }),
  alt_text: Joi.string().allow("", null),
  sequence: Joi.number().integer().min(0).default(0),
  status: Joi.string().valid("active", "inactive").default("active"),
});

const updateWhyChooseSection = Joi.object({
  section_title: Joi.string().allow("", null),
  section_description: Joi.string().allow("", null),
});

const saveWhyChooseCard = Joi.object({
  card_title: Joi.string().trim().required().messages({
    "string.empty": "Card title is required",
    "any.required": "Card title is required",
  }),
  card_description: Joi.string().trim().required().messages({
    "string.empty": "Card description is required",
    "any.required": "Card description is required",
  }),
  file_url: Joi.string().trim().required().messages({
    "string.empty": "Video / Primary Media Upload is required",
    "any.required": "Video / Primary Media Upload is required",
  }),
  cover_image_url: Joi.string().allow("", null),
  cover_image_alt: Joi.string().allow("", null),
  alt_text: Joi.string().trim().required().messages({
    "string.empty": "Primary media alt text is required",
    "any.required": "Primary media alt text is required",
  }),
  sequence: Joi.number().integer().min(0).default(0),
  status: Joi.string().valid("active", "inactive").default("active"),
});

const saveBanner = Joi.object({
  title: Joi.string().allow("", null),
  file_url: Joi.string().trim().required().messages({
    "string.empty": "Banner media (image or video) is required",
    "any.required": "Banner media (image or video) is required",
  }),
  alt_text: Joi.string().allow("", null),
  cta_text: Joi.string().allow("", null),
  cta_link: Joi.string().allow("", null),
  sequence: Joi.number().integer().min(0).default(0),
  status: Joi.string().valid("active", "inactive").default("active"),
});

module.exports = {
  saveStat,
  updateProcessSection,
  saveProcessStep,
  updateWhyChooseSection,
  saveWhyChooseCard,
  saveBanner,
};
