const path = require("path");
const fs = require("fs");
const multer = require("multer");
const AppError = require("../utils/AppError");

const uploadDirectory = path.resolve(process.env.UPLOAD_DIR || "./uploads");

fs.mkdirSync(uploadDirectory, {
  recursive: true,
});

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/x-zip-compressed",
  "application/x-rar-compressed",
  "application/octet-stream",
]);

const fileFilter = (_req, file, cb) => {
  if (
    file.mimetype.startsWith("image/") ||
    file.mimetype.startsWith("video/") ||
    ALLOWED_MIME_TYPES.has(file.mimetype)
  ) {
    cb(null, true);
  } else {
    cb(new AppError("Unsupported file type. Please upload a valid image, video, PDF, document, or archive.", 400), false);
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB
  },
});

module.exports = upload;
