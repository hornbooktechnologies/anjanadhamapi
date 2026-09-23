const express = require("express");
const router = express.Router();
const controller = require("./contact-enquiries.controller");
const validation = require("./contact-enquiries.validation");
const validate = require("../../middlewares/validate.middleware");
const authMiddleware = require("../../middlewares/auth.middleware");
const asyncHandler = require("../../utils/asyncHandler");

router.post("/", validate(validation.submitContactEnquiry), asyncHandler(controller.submit));
router.get("/", authMiddleware, asyncHandler(controller.list));

module.exports = router;
