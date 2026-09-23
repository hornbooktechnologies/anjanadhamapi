const AppError = require("../utils/AppError");

/**
 * Express middleware to validate request payload using a Joi schema.
 * @param {Joi.Schema} schema Joi validation schema
 * @param {string} source Location of data (body, query, params)
 */
const validate = (schema, source = "body") => {
  return (req, res, next) => {
    const { value, error } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.reduce((acc, current) => {
        acc[current.path.join(".")] = current.message;
        return acc;
      }, {});
      
      const validationError = new AppError("Validation failed", 400);
      validationError.name = "ValidationError";
      validationError.details = details;
      return next(validationError);
    }

    req[source] = value; // Replace original request data with parsed/sanitized data
    next();
  };
};

module.exports = validate;
