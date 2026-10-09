const Joi = require("joi");

const saveTeamMember = Joi.object({
  group_name: Joi.string().trim().max(255).required().messages({
    "string.empty": "Group is required",
  }),
  name: Joi.string().required().messages({
    "string.empty": "Name is required",
  }),
  designation: Joi.string().required().messages({
    "string.empty": "Designation is required",
  }),
  location: Joi.string().trim().max(255).allow("", null).optional(),
  photo_url: Joi.string().required().messages({
    "string.empty": "Photo is required",
  }),
  photo_alt: Joi.string().required().messages({
    "string.empty": "Photo Alt Text is required",
  }),
  linkedin_url: Joi.string().uri().allow("", null).optional().messages({
    "string.uri": "LinkedIn URL must be a valid URL format",
  }),
  show_on_homepage: Joi.number().valid(0, 1).default(0),
  sequence: Joi.number().default(0),
  status: Joi.string().valid("active", "inactive").default("active"),
});

const saveLifeAtGdb = Joi.object({
  file_url: Joi.string().required().messages({
    "string.empty": "Image is required",
  }),
  alt_text: Joi.string().required().messages({
    "string.empty": "Image Alt Text is required",
  }),
  slider_group: Joi.number().valid(1, 2).default(1),
  sequence: Joi.number().default(0),
  status: Joi.string().valid("active", "inactive").default("active"),
});

const updateLifeSection = Joi.object({
  section_title: Joi.string().allow("", null),
  section_description: Joi.string().allow("", null),
});

module.exports = {
  saveTeamGroup: Joi.object({
    title: Joi.string().trim().max(255).required(),
    description: Joi.string().trim().max(5000).allow('', null).default(''),
    sequence: Joi.number().integer().min(0).max(1000000).default(0),
    status: Joi.string().valid('active', 'inactive').default('active'),
  }),
  saveTeamMember,
  saveLifeAtGdb,
  updateLifeSection,
};
