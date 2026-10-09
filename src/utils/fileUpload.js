const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const sharp = require("sharp");
const AppError = require("./AppError");
const { query } = require("../config/database");
const {
  getUploadRootDir,
  getUploadTargetDir,
  normalizeUploadPath,
  getUploadFileCopies,
} = require("./uploadStorage");
const { writeProfileFile, deleteProfileBlob } = require('./profileStorage');
const { isBannerUpload, writeBannerFile, deleteBannerBlob } = require('./bannerStorage');

const WEBP_TARGET_QUALITIES = [85, 80, 75, 70];
const WEBP_INPUT_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const FILE_REFERENCE_COLUMNS = [
  { table: "seo_content", column: "og_image" },
  { table: "seo_content", column: "twitter_image" },
  { table: "social_links", column: "icon_url" },
  { table: "certificates", column: "image_url" },
  { table: "banners", column: "file_url" },
  { table: "homepage_banners", column: "file_url" },
  { table: "homepage_stats", column: "icon_url" },
  { table: "homepage_process_steps", column: "file_url" },
  { table: "homepage_whychoose_cards", column: "file_url" },
  { table: "homepage_whychoose_cards", column: "cover_image_url" },
  { table: "facilities", column: "image_url" },
  { table: "facilities_what_we_do_cards", column: "icon_url" },
  { table: "team_members", column: "photo_url" },
  { table: "key_members", column: "photo_url" },
  { table: "donors", column: "photo_url" },
  { table: "blogs", column: "image_url" },
  { table: "documents", column: "file_url" },
  { table: "about_gdb_journey_timeline_items", column: "icon_url" },
  { table: "about_gdb_journey_timeline_items", column: "image_url" },
  { table: "case_studies", column: "image_url" },
  { table: "product_catalogue", column: "image_url" },
  { table: "quality_assurance_cards", column: "icon_url" },
  { table: "seller_always_buying", column: "file_url" },
  { table: "seller_feedstock", column: "image_url" },
  { table: "seller_logistics_cards", column: "icon_url" },
  { table: "team_life_gallery", column: "file_url" },
  { table: "news_content", column: "image_url" },
  { table: "news_content", column: "logo_url" },
  { table: "gallery_images", column: "image_url" },
  { table: "gallery_videos", column: "video_url" },
  { table: "gallery_videos", column: "thumbnail_url" },
  { table: "media_coverage", column: "media_url" },
  { table: "media_coverage", column: "thumbnail_url" },
];

function ensureUploadDirectories() {
  const uploadsDir = getUploadRootDir();
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
}

function getExtensionForMimeType(mimeType, originalName = "") {
  const extensionMap = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/webp": "webp",
    "image/png": "png",
    "image/gif": "gif",
    "image/svg+xml": "svg",
    "image/avif": "avif",
    "image/bmp": "bmp",
    "image/x-icon": "ico",
    "image/vnd.microsoft.icon": "ico",
    "image/tiff": "tiff",
    "image/heic": "heic",
    "image/heif": "heif",
    "application/pdf": "pdf",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
    "video/x-msvideo": "avi",
    "video/x-matroska": "mkv",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/ogg": "ogg",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.ms-powerpoint": "ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "text/plain": "txt",
    "text/csv": "csv",
    "text/html": "html",
    "application/json": "json",
    "application/zip": "zip",
    "application/x-zip-compressed": "zip",
    "application/x-rar-compressed": "rar",
  };

  if (mimeType && extensionMap[mimeType]) return extensionMap[mimeType];

  if (originalName && originalName.includes(".")) {
    const ext = originalName.split(".").pop().trim().toLowerCase();
    if (ext && ext.length <= 10 && /^[a-z0-9]+$/.test(ext)) {
      return ext;
    }
  }

  if (mimeType && mimeType.startsWith("image/")) {
    return mimeType.split("/")[1].replace("+xml", "").replace("x-", "");
  }
  if (mimeType && mimeType.startsWith("video/")) {
    return mimeType.split("/")[1].replace("x-", "");
  }

  return "bin";
}

async function compressToWebp(buffer) {
  try {
    const metadata = await sharp(buffer).metadata();
    let width = metadata.width || null;
    let currentBuffer = await sharp(buffer)
      .rotate()
      .resize(width && width > 2400 ? { width: 2400, withoutEnlargement: true } : {})
      .webp({ quality: 82 })
      .toBuffer();

    return currentBuffer || buffer;
  } catch (err) {
    // If sharp fails for any reason, return original buffer
    return buffer;
  }
}

async function prepareStoredFile({ buffer, mimeType, originalName = "" }) {
  if (WEBP_INPUT_TYPES.has(mimeType)) {
    try {
      const processedBuffer = await compressToWebp(buffer);
      return {
        buffer: processedBuffer,
        extension: "webp",
        mimeType: "image/webp",
        originalName,
      };
    } catch (e) {
      // Fallback
    }
  }

  const extension = getExtensionForMimeType(mimeType, originalName);

  return {
    buffer,
    extension,
    mimeType,
    originalName,
  };
}

function buildPublicUploadPath(subFolder, filename) {
  const normalizedSubFolder = String(subFolder || "").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  return normalizedSubFolder ? `/uploads/${normalizedSubFolder}/${filename}` : `/uploads/${filename}`;
}

async function writeStoredFile({ buffer, extension, subFolder = "general" }) {
  if (subFolder === 'key_members' || subFolder === 'portraits') {
    const url = buildPublicUploadPath(subFolder, `${crypto.randomBytes(16).toString('hex')}.${extension}`);
    await require('./profileCleanup').scheduleProfileCleanup(url, 24 * 60 * 60 * 1000);
    await writeProfileFile(url, buffer, extension === 'webp' ? 'image/webp' : undefined);
    return url;
  }
  const uploadPath = buildPublicUploadPath(subFolder, `${crypto.randomBytes(16).toString('hex')}.${extension}`);
  if (isBannerUpload(uploadPath)) {
    await require('./profileCleanup').scheduleProfileCleanup(uploadPath, 24 * 60 * 60 * 1000);
    return writeBannerFile(uploadPath, buffer);
  }
  ensureUploadDirectories();
  const targetDir = getUploadTargetDir(subFolder);
  const filename = `${crypto.randomBytes(16).toString("hex")}.${extension}`;
  const filePath = path.join(targetDir, filename);
  fs.writeFileSync(filePath, buffer);
  return buildPublicUploadPath(subFolder, filename);
}

/**
 * Handles Base64 file upload, saving it locally without file size restrictions.
 * @param {string} base64Data The base64 file representation
 * @param {string} subFolder Subfolder inside uploads (e.g. 'banners', 'seo')
 * @returns {Promise<string>} The relative path of the saved file
 */
async function uploadBase64File(base64Data, subFolder = "general") {
  if (!base64Data) return null;

  const matches = base64Data.match(/^data:([A-Za-z0-9.+/-]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new AppError("Invalid file format. Please upload a valid image or video.", 400);
  }

  const mimeType = matches[1];
  const rawBuffer = Buffer.from(matches[2], "base64");

  const storedFile = await prepareStoredFile({
    buffer: rawBuffer,
    mimeType,
  });

  return writeStoredFile({
    buffer: storedFile.buffer,
    extension: storedFile.extension,
    subFolder,
  });
}

async function saveUploadedBuffer(file, subFolder = "") {
  if (!file?.buffer) {
    throw new AppError("No file uploaded", 400);
  }

  const storedFile = await prepareStoredFile({
    buffer: file.buffer,
    mimeType: file.mimetype,
    originalName: file.originalname,
  });

  return writeStoredFile({
    buffer: storedFile.buffer,
    extension: storedFile.extension,
    subFolder,
  });
}

function deleteStoredFile(relativePath) {
  let deleted = false;
  for (const file of getUploadFileCopies(relativePath)) {
    try {
      fs.unlinkSync(file);
      deleted = true;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  return deleted;
}

async function isStoredFileReferenced(relativePath) {
  if (!relativePath || typeof relativePath !== "string") {
    return false;
  }

  const normalizedPath = normalizeUploadPath(relativePath);
  if (!normalizedPath) {
    return false;
  }

  for (const ref of FILE_REFERENCE_COLUMNS) {
    try {
      const rows = await query(
        `SELECT 1 AS matched FROM ${ref.table} WHERE ${ref.column} = ? OR RIGHT(${ref.column}, ?) = ? LIMIT 1`,
        [normalizedPath, normalizedPath.length, normalizedPath]
      );
      if (rows.length) {
        return true;
      }
    } catch (error) {
      if (!['ER_NO_SUCH_TABLE', 'ER_BAD_FIELD_ERROR'].includes(error.code)) throw error;
    }
  }

  try {
    const overviewRows = await query(
      "SELECT 1 AS matched FROM about_gdb_overview WHERE LOCATE(?, images) > 0 LIMIT 1",
      [normalizedPath]
    );
    if (overviewRows.length) {
      return true;
    }
  } catch (error) {
    if (!['ER_NO_SUCH_TABLE', 'ER_BAD_FIELD_ERROR'].includes(error.code)) throw error;
  }

  return false;
}

async function cleanupStoredFile(url) {
  if (!normalizeUploadPath(url)) return { deleted: false, skipped: true };
  if (await isStoredFileReferenced(url)) return { deleted: false, skipped: true };
  const cloudDeleted = isBannerUpload(url) ? await deleteBannerBlob(url) : await deleteProfileBlob(url);
  const localDeleted = deleteStoredFile(url);
  return { deleted: cloudDeleted || localDeleted, skipped: false };
}

module.exports = {
  uploadBase64File,
  saveUploadedBuffer,
  deleteStoredFile,
  isStoredFileReferenced,
  cleanupStoredFile,
};
