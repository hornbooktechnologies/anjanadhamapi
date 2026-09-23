const fs = require("fs");
const path = require("path");
const appRootDir = path.resolve(__dirname, "../..");
const uploadRootDir = path.resolve(process.env.UPLOAD_DIR || "./uploads");

function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function initializeUploadStorage() {
  ensureDirectory(uploadRootDir);
}

function getUploadRootDir() {
  initializeUploadStorage();
  return uploadRootDir;
}

function getLegacyUploadRootDir() {
  return path.join(appRootDir, "uploads");
}

function getUploadTargetDir(subFolder = "") {
  const targetDir = path.join(getUploadRootDir(), subFolder);
  ensureDirectory(targetDir);
  return targetDir;
}

function getAbsolutePathFromPublicUploadPath(relativePath) {
  if (!relativePath) {
    return "";
  }

  const normalized = String(relativePath).replace(/^\/uploads\/?/, "").replace(/\\/g, "/");
  const primaryPath = path.join(getUploadRootDir(), normalized);

  if (fs.existsSync(primaryPath)) {
    return primaryPath;
  }

  const legacyPath = path.join(getLegacyUploadRootDir(), normalized);
  if (legacyPath !== primaryPath && fs.existsSync(legacyPath)) {
    return legacyPath;
  }
  return primaryPath;
}

module.exports = {
  getUploadRootDir,
  getLegacyUploadRootDir,
  getUploadTargetDir,
  getAbsolutePathFromPublicUploadPath,
};
