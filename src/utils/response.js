/**
 * Standard Success Response formatter
 */
const successResponse = (res, message = "Success", data = {}, statusCode = 200, pagination = null) => {
  const payload = {
    success: true,
    message,
    data,
  };

  if (pagination) {
    payload.pagination = pagination;
  }

  return res.status(statusCode).json(payload);
};


/**
 * Standard Error Response formatter
 */
const errorResponse = (res, message = "Error", error = {}, statusCode = 500) => {
  return res.status(statusCode).json({
    success: false,
    message,
    error: typeof error === "string" ? { message: error } : error,
  });
};

module.exports = {
  successResponse,
  errorResponse,
};
