const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');
const multer = require('multer');
const AppError = require('./AppError');
const { getUploadTargetDir } = require('./uploadStorage');

const portraitUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, done) => done(null, ['image/png', 'image/jpeg', 'image/webp'].includes(file.mimetype)),
});

async function savePortrait(file) {
  if (!file) throw new AppError('Choose a JPG, PNG or WebP portrait.', 400);
  let metadata;
  try { metadata = await sharp(file.buffer, { limitInputPixels: 40000000 }).metadata(); }
  catch { throw new AppError('The portrait image is invalid or too large.', 400); }
  if (!['png', 'jpeg', 'webp'].includes(metadata.format) || (metadata.pages || 1) > 1) {
    throw new AppError('Choose a single JPG, PNG or WebP portrait.', 400);
  }
  const filename = `${crypto.randomUUID()}.${metadata.format === 'jpeg' ? 'jpg' : metadata.format}`;
  const directory = getUploadTargetDir('portraits');
  fs.mkdirSync(directory, { recursive: true });
  // Store the exact uploaded bytes: processed PNGs are never recompressed to WebP.
  await fs.promises.writeFile(path.join(directory, filename), file.buffer);
  return `/uploads/portraits/${filename}`;
}
module.exports = { portraitUpload, savePortrait };
