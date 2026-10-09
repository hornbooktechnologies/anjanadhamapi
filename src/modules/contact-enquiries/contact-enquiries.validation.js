const Joi = require("joi");
const { options } = require('./contact-enquiries.forms');

const text = max => Joi.string().trim().max(max).required();
const phone = Joi.string().trim().pattern(/^\+?[\d\s().-]{7,25}$/).required();
const choice = name => Joi.string().valid(...Object.keys(options[name])).required();
const location = { city: text(150), state: text(150) };
const membership = Joi.object({
  ...location,
  dateOfBirth: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).custom((value, helpers) => {
    const date = new Date(`${value}T00:00:00Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value || date > new Date()) return helpers.error('any.invalid');
    return value;
  }).required(),
  occupation: Joi.string().trim().max(150).allow('').default(''),
  preferredContact: choice('preferredContact'), membershipCategory: choice('membershipCategory'),
  contributionInterest: text(2000), address: text(1500), memberConsent: Joi.boolean().valid(true).required(),
});
const volunteer = Joi.object({
  ...location, ageGroup: choice('ageGroup'), serviceArea: choice('serviceArea'), availability: choice('availability'),
  skills: text(2000), motivation: text(2000), emergencyContact: phone.allow('').optional().default(''),
  volunteerConsent: Joi.boolean().valid(true).required(),
});

const submitContactEnquiry = Joi.object({
  full_name: Joi.string().trim().min(2).max(255).required(),
  phone_number: phone,
  email: Joi.string().trim().email().max(100).required(),
  form_type: Joi.string().valid('contact', 'membership', 'volunteer').default('contact'),
  inquiry_purpose: Joi.string().trim().max(150).when('form_type', { is: 'contact', then: Joi.required(), otherwise: Joi.optional().allow('') }),
  message: Joi.string().trim().max(5000).when('form_type', { is: 'contact', then: Joi.required(), otherwise: Joi.optional().allow('') }),
  details: Joi.when('form_type', { switch: [
    { is: 'membership', then: membership.required() },
    { is: 'volunteer', then: volunteer.required() },
  ], otherwise: Joi.forbidden() }),
  page_url: Joi.string().trim().max(255).allow("", null),
});

module.exports = {
  submitContactEnquiry,
};
