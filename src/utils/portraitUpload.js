const crypto = require('node:crypto');
const sharp = require('sharp');
const multer = require('multer');
const AppError = require('./AppError');
const { writeProfileFile } = require('./profileStorage');
const { scheduleProfileCleanup } = require('./profileCleanup');

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
  // Store the exact uploaded bytes: processed PNGs are never recompressed to WebP.
  const url = `/uploads/portraits/${filename}`;
  // Clean up uploads abandoned by a closed tab or cancelled form after one day.
  await scheduleProfileCleanup(url, 24 * 60 * 60 * 1000);
  await writeProfileFile(url, file.buffer, `image/${metadata.format}`);
  return url;
}
module.exports = { portraitUpload, savePortrait };
