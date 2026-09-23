const { errorResponse } = require("../utils/response");

module.exports = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  // Development vs Production error logging
  if (process.env.NODE_ENV === "development") {
    console.error("Error Middleware Log:", err);
  }

  // Format standard validation errors or database constraint exceptions
  let errorPayload = {};
  if (err.name === "ValidationError") {
    // Joi Validation errors
    return errorResponse(res, "Validation failed", err.details || err.message, 400);
  } else if (err.isOperational) {
    errorPayload = {
      message: err.message,
    };
  } else {
    // Production hidden/sanitized system errors
    errorPayload = {
      message: process.env.NODE_ENV === "production" ? "Something went wrong!" : err.message,
      stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
    };
  }

  return errorResponse(res, message, errorPayload, statusCode);
};
