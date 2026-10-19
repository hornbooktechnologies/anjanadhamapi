const sharp = require('sharp');
const multer = require('multer');
const AppError = require('../../utils/AppError');

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_PIXELS = 40 * 1000 * 1000;
const MAX_DIMENSION = 4096;

function signature(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg';
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'png';
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  if (buffer.length >= 16 && buffer.toString('ascii', 4, 8) === 'ftyp') {
    const length = buffer.readUInt32BE(0);
    if (length < 16 || length > Math.min(buffer.length, 4096) || length % 4) return null;
    const brands = [buffer.toString('ascii', 8, 12)];
    for (let offset = 16; offset < length; offset += 4) brands.push(buffer.toString('ascii', offset, offset + 4));
    if (brands.includes('avif')) return 'avif';
  }
  return null;
}

async function processImage(file) {
  if (!file?.buffer?.length) throw new AppError('One image file is required.', 400);
  if (file.buffer.length > MAX_BYTES) throw new AppError('Images must be 5 MB or smaller.', 413);
  const format = signature(file.buffer);
  if (!format) throw new AppError('Only JPEG, PNG, WebP and AVIF image data is accepted.', 415);
  try {
    const options = { limitInputPixels: MAX_PIXELS, failOn: 'warning', sequentialRead: true };
    const metadata = await sharp(file.buffer, options).metadata();
    if (!(metadata.width > 0 && metadata.height > 0) || metadata.width * metadata.height > MAX_PIXELS ||
        (metadata.pages || 1) > 1 || (format === 'avif' ? metadata.format !== 'heif' || metadata.compression !== 'av1' : metadata.format !== format)) {
      throw new Error('Unsupported image dimensions or animation');
    }
    // Full decode and re-encoding removes metadata and appended/non-image payloads.
    const { data, info } = await sharp(file.buffer, options).rotate()
      .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82, effort: 4 }).toBuffer({ resolveWithObject: true });
    if (data.length > MAX_BYTES) throw new AppError('The processed image exceeds 5 MB.', 413);
    return { buffer: data, mimeType: 'image/webp', width: info.width, height: info.height };
  } catch (error) {
    if (error.isOperational) throw error;
    throw new AppError('The image could not be safely decoded. Use a valid, non-animated image of at most 40 megapixels.', 415);
  }
}

const parser = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_BYTES, files: 1, fields: 1, fieldSize: 1200, parts: 2 } }).single('file');
function uploadImage(req, res, next) {
  parser(req, res, error => {
    if (error) return next(new AppError(error.code === 'LIMIT_FILE_SIZE' ? 'Images must be 5 MB or smaller.' : 'Upload exactly one image and an optional alt text.', error.code === 'LIMIT_FILE_SIZE' ? 413 : 400));
    if (Object.keys(req.body || {}).some(key => key !== 'alt')) return next(new AppError('Only the file and optional alt text are accepted.', 400));
    return next();
  });
}

module.exports = { MAX_BYTES, MAX_PIXELS, MAX_DIMENSION, signature, processImage, uploadImage };
