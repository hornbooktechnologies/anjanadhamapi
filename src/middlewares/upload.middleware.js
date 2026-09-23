const path = require("path");
const fs = require("fs");
const multer = require("multer");
const AppError = require("../utils/AppError");

const uploadDirectory = path.resolve(process.env.UPLOAD_DIR || "./uploads");

fs.mkdirSync(uploadDirectory, {
  recursive: true,
});

const fileFilter = (_req, file, cb) => {
  if (
    file.mimetype.startsWith("image/") ||
    file.mimetype.startsWith("video/") ||
    file.mimetype === "application/pdf"
  ) {
    cb(null, true);
  } else {
    cb(new AppError("Unsupported file type. Please upload a valid image, video, or PDF.", 400), false);
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
