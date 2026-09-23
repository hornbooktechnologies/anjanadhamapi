const express = require("express");
const router = express.Router();
const ctrl = require("./team.controller");
const v = require("./team.validation");
const validate = require("../../middlewares/validate.middleware");
const authMiddleware = require("../../middlewares/auth.middleware");
const checkPermission = require("../../middlewares/permission.middleware");
const asyncHandler = require("../../utils/asyncHandler");

// Public GET routes
router.get("/members", asyncHandler(ctrl.getMembers));
router.get("/members/:id", asyncHandler(ctrl.getMemberById));
router.get("/life-at-gdb/section", asyncHandler(ctrl.getLifeSection));
router.get("/life-at-gdb", asyncHandler(ctrl.getLifeItems));
router.get("/life-at-gdb/:id", asyncHandler(ctrl.getLifeItemById));

router.use(authMiddleware);

// ==========================================
// TEAM MEMBERS ROUTES
// ==========================================
router.post(
  "/members",
  checkPermission("team.members.create"),
  validate(v.saveTeamMember),
  asyncHandler(ctrl.createMember)
);
router.put(
  "/members/:id",
  checkPermission("team.members.update"),
  validate(v.saveTeamMember),
  asyncHandler(ctrl.updateMember)
);
router.delete(
  "/members/:id",
  checkPermission("team.members.delete"),
  asyncHandler(ctrl.deleteMember)
);
router.patch(
  "/members/:id/status",
  checkPermission("team.members.update"),
  asyncHandler(ctrl.toggleMemberStatus)
);

// ==========================================
// LIFE AT GDB ROUTES
// ==========================================
router.put(
  "/life-at-gdb/section",
  checkPermission("team.life.update"),
  validate(v.updateLifeSection),
  asyncHandler(ctrl.updateLifeSection)
);
router.post(
  "/life-at-gdb",
  checkPermission("team.life.create"),
  validate(v.saveLifeAtGdb),
  asyncHandler(ctrl.createLifeItem)
);
router.put(
  "/life-at-gdb/:id",
  checkPermission("team.life.update"),
  validate(v.saveLifeAtGdb),
  asyncHandler(ctrl.updateLifeItem)
);
router.delete(
  "/life-at-gdb/:id",
  checkPermission("team.life.delete"),
  asyncHandler(ctrl.deleteLifeItem)
);
router.patch(
  "/life-at-gdb/:id/status",
  checkPermission("team.life.update"),
  asyncHandler(ctrl.toggleLifeItemStatus)
);

module.exports = router;
