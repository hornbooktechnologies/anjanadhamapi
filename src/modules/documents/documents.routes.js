const express = require("express");
const router = express.Router();
const controller = require("./documents.controller");
const authMiddleware = require("../../middlewares/auth.middleware");
const documentAccessMiddleware = require("../../middlewares/documentAccess.middleware");
const upload = require("../../middlewares/upload.middleware");

// Require Auth & Email Access for all document routes
router.use(authMiddleware);
router.use(documentAccessMiddleware);

router.get("/", controller.getAll);
router.get("/:id", controller.getById);
router.post("/", upload.single("file"), controller.create);
router.put("/:id", controller.update);
router.delete("/:id", controller.remove);

module.exports = router;
