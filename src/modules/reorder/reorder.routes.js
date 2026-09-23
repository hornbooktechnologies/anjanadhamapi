const express = require("express");
const router = express.Router();
const authMiddleware = require("../../middlewares/auth.middleware");
const asyncHandler = require("../../utils/asyncHandler");
const controller = require("./reorder.controller");

router.post("/sequence", authMiddleware, asyncHandler(controller.reorderSequence));

module.exports = router;
