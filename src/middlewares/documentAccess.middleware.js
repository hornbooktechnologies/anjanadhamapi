const AppError = require("../utils/AppError");

module.exports = (req, res, next) => {
  const allowedEmail = (process.env.DOCUMENT_ACCESS_EMAIL || "panchal.mehul6015@gmail.com").trim().toLowerCase();
  const userEmail = req.user?.email ? req.user.email.trim().toLowerCase() : "";

  if (!userEmail || userEmail !== allowedEmail) {
    return next(new AppError("Access denied. You do not have permission to access the Document module.", 403));
  }

  next();
};
