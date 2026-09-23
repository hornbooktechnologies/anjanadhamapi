const express = require("express");
const router = express.Router();
const authMiddleware = require("../../middlewares/auth.middleware");
const asyncHandler = require("../../utils/asyncHandler");
const { successResponse } = require("../../utils/response");
const dashboardService = require("./dashboard.service");

router.get(
  "/summary",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const summary = await dashboardService.getDashboardSummary();
    return successResponse(res, "Dashboard summary fetched successfully", summary);
  })
);

module.exports = router;
