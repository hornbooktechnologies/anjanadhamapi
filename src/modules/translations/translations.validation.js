const Joi = require("joi");

const languageCode = Joi.string().valid("hi", "gu");
const translationValues = Joi.object().pattern(
  Joi.string().trim().min(1),
  Joi.string().allow("", null)
);

const autoFillSchema = Joi.object({
  fields: Joi.object().pattern(
    Joi.string().trim().min(1),
    Joi.string().allow("", null)
  ).required(),
  targetLanguages: Joi.array().items(languageCode).default(["hi", "gu"]),
});

const saveTranslationsSchema = Joi.object({
  translations: Joi.object({
    hi: translationValues.default({}),
    gu: translationValues.default({}),
  }).required(),
});

module.exports = {
  autoFillSchema,
  saveTranslationsSchema,
  translationValues,
};
