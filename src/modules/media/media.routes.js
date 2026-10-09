const express = require("express");
const router = express.Router();
const AppError = require("../../utils/AppError");
const { successResponse } = require("../../utils/response");
const authMiddleware = require("../../middlewares/auth.middleware");
const upload = require("../../middlewares/upload.middleware");
const { saveUploadedBuffer, cleanupStoredFile, isStoredFileReferenced } = require("../../utils/fileUpload");
const { scheduleProfileCleanup, processProfileCleanup } = require('../../utils/profileCleanup');
const { portraitUpload, savePortrait } = require("../../utils/portraitUpload");

router.get('/cleanup', async (req, res, next) => {
  if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return next(new AppError('Unauthorized', 401));
  try { return successResponse(res, 'Profile cleanup completed', await processProfileCleanup()); }
  catch (error) { next(error); }
});
router.post('/cleanup', authMiddleware, async (req, res, next) => {
  try { return successResponse(res, 'Profile cleanup completed', await processProfileCleanup()); }
  catch (error) { next(error); }
});

router.post("/portrait", authMiddleware, portraitUpload.single("file"), async (req, res, next) => {
  try {
    const url = await savePortrait(req.file);
    return successResponse(res, "Portrait uploaded successfully", { url });
  } catch (error) { next(error); }
});

// POST /api/v1/media/upload
router.post("/upload", authMiddleware, upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError("No file uploaded", 400);
    }

    const fileUrl = await saveUploadedBuffer(req.file);
    return successResponse(res, "File uploaded successfully", { url: fileUrl });
  } catch (error) {
    next(error);
  }
});

router.delete("/upload", authMiddleware, async (req, res, next) => {
  try {
    const fileUrl = String(req.body?.url || req.query?.url || "").trim();
    if (!fileUrl) {
      throw new AppError("File URL is required", 400);
    }

    const isReferenced = await isStoredFileReferenced(fileUrl);
    if (isReferenced) {
      return successResponse(res, "File is in use and was not deleted", { deleted: false, skipped: true, url: fileUrl });
    }

    await scheduleProfileCleanup(fileUrl);
    const result = await cleanupStoredFile(fileUrl);
    await processProfileCleanup();
    return successResponse(res, result.skipped ? 'File is not a managed upload' : result.deleted ? "File deleted successfully" : "File not found", { ...result, url: fileUrl });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
