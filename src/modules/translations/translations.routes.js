const express = require("express");
const router = express.Router();
const authMiddleware = require("../../middlewares/auth.middleware");
const validate = require("../../middlewares/validate.middleware");
const asyncHandler = require("../../utils/asyncHandler");
const controller = require("./translations.controller");
const validation = require("./translations.validation");

router.use(authMiddleware);

router.post("/auto-fill", validate(validation.autoFillSchema), asyncHandler(controller.autoFill));
router.get("/:entityType/:entityId", asyncHandler(controller.getForEntity));
router.put("/:entityType/:entityId", validate(validation.saveTranslationsSchema), asyncHandler(controller.saveForEntity));

module.exports = router;
