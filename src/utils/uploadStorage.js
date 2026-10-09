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
  const paths = getUploadFileCopies(relativePath);
  return paths.find(file => fs.existsSync(file)) || paths[0] || "";
}

// Only application-owned upload paths are eligible for deletion.
function normalizeUploadPath(value) {
  if (typeof value !== "string") return null;
  const candidate = value.trim();
  if (!candidate.startsWith("/uploads/")) return null;
  const segments = candidate.slice(9).split("/");
  if (!segments.length || segments.some(segment => !segment || segment === "." || segment === ".." || !/^[a-zA-Z0-9_.-]+$/.test(segment))) return null;
  return `/uploads/${segments.join("/")}`;
}

function getUploadFileCopies(value) {
  const normalized = normalizeUploadPath(value);
  if (!normalized) return [];
  const roots = [...new Set([uploadRootDir, getLegacyUploadRootDir(), path.join(appRootDir, "public", "uploads")])];
  return roots.map(root => {
    const target = path.resolve(root, normalized.slice(9));
    if (!target.startsWith(`${path.resolve(root)}${path.sep}`)) throw new Error("Invalid upload path");
    // Refuse symlinks that could lead outside a managed upload directory.
    if (fs.existsSync(target)) {
      const realRoot = fs.realpathSync(root);
      if (!fs.realpathSync(target).startsWith(`${realRoot}${path.sep}`)) throw new Error("Upload path escapes its storage directory");
    }
    return target;
  });
}

module.exports = {
  getUploadRootDir,
  getLegacyUploadRootDir,
  getUploadTargetDir,
  getAbsolutePathFromPublicUploadPath,
  normalizeUploadPath,
  getUploadFileCopies,
};
