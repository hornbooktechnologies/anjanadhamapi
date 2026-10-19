const express = require('express');
const path = require('node:path');
const auth = require('../../middlewares/auth.middleware');
const permission = require('../../middlewares/permission.middleware');
const AppError = require('../../utils/AppError');
const { successResponse } = require('../../utils/response');
const { uploadImage } = require('./image');
const service = require('./service');

function reportError(error, next) {
  if (error.isOperational) return next(error);
  console.error('Media service failure:', error.code || error.message);
  return next(new AppError('The media service is temporarily unavailable.', 503));
}

const admin = express.Router();
admin.use(auth, permission('media.upload'));
let activeUploads = 0;
function capacity(req, res, next) {
  if (activeUploads >= 2) return next(new AppError('Image processing is busy. Please retry shortly.', 429));
  activeUploads++;
  let released = false;
  const release = () => { if (!released) { released = true; activeUploads--; } };
  req.releaseMediaCapacity = release;
  res.once('finish', release);
  res.once('close', () => { if (!req.mediaProcessing) release(); });
  next();
}

admin.post('/', capacity, uploadImage, async (req, res, next) => {
  req.mediaProcessing = true;
  try { successResponse(res, 'Image uploaded', await service.upload(req.file, req.user, req.body.alt), 201); }
  catch (error) { reportError(error, next); }
  finally { req.releaseMediaCapacity(); }
});
admin.get('/', async (req, res, next) => {
  try { successResponse(res, 'Images fetched', await service.list(req.user)); }
  catch (error) { reportError(error, next); }
});
admin.delete('/:id', async (req, res, next) => {
  try { successResponse(res, 'Image cleanup requested', await service.requestDeletion(req.params.id, req.user), 202); }
  catch (error) { reportError(error, next); }
});

const publicImages = express.Router();
publicImages.get('/:safeFilename', async (req, res, next) => {
  try {
    const { handle, stat, record } = await service.publicFile(req.params.safeFilename);
    if (res.destroyed || req.aborted) { await handle.close(); return; }
    res.set({
      'Content-Type': 'image/webp', 'Content-Length': String(stat.size),
      'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'public, max-age=3600, must-revalidate',
      'Content-Disposition': 'inline; filename="' + record.filename + '"',
      'ETag': '"' + record.sha256 + '"',
    });
    if (req.fresh || req.method === 'HEAD') {
      await handle.close();
      return res.status(req.fresh ? 304 : 200).end();
    }
    const stream = handle.createReadStream();
    res.once('close', () => stream.destroy());
    stream.once('error', error => { if (res.headersSent) res.destroy(); else next(error); });
    stream.pipe(res);
  } catch (error) { reportError(error, next); }
});

function protectLegacyPath(req, res, next) {
  try {
    const decoded = decodeURIComponent(req.path).replace(/\\/g, '/');
    const normalized = path.posix.normalize(decoded).toLowerCase();
    if (normalized === '/uploads/admin-media' || normalized.startsWith('/uploads/admin-media/')) return res.status(404).end();
    next();
  } catch { next(new AppError('Invalid request path.', 400)); }
}

module.exports = { admin, publicImages, protectLegacyPath };
