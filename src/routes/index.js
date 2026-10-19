const express = require("express");
const router = express.Router();

const authRoutes = require("../modules/auth/auth.routes");
const rolesRoutes = require("../modules/roles/roles.routes");
const permissionsRoutes = require("../modules/permissions/permissions.routes");
const usersRoutes = require("../modules/users/users.routes");
const dashboardRoutes = require("../modules/dashboard/dashboard.routes");
const globalContentRoutes = require("../modules/global-content/global-content.routes");
const homepageRoutes = require("../modules/homepage/homepage.routes");
const mediaRoutes = require("../modules/media/media.routes");
const teamRoutes = require("../modules/team/team.routes");
const reorderRoutes = require("../modules/reorder/reorder.routes");
const galleryRoutes = require("../modules/gallery/gallery.routes");
const galleryVideoRoutes = require("../modules/gallery-video/gallery-video.routes");
const mediaCoverageRoutes = require("../modules/media-coverage/media-coverage.routes");
const facilitiesRoutes = require("../modules/facilities/facilities.routes");
const keyMembersRoutes = require("../modules/key-members/key-members.routes");
const donorsRoutes = require("../modules/donors/donors.routes");
const blogsRoutes = require("../modules/blogs/blogs.routes");
const newsRoutes = require("../modules/news/news.routes");
const contactEnquiriesRoutes = require("../modules/contact-enquiries/contact-enquiries.routes");
const translationsRoutes = require("../modules/translations/translations.routes");
const documentsRoutes = require("../modules/documents/documents.routes");

const authMiddleware = require("../middlewares/auth.middleware");
const { query } = require("../config/database");
const { successResponse } = require("../utils/response");

// Health check API
router.get("/health", (req, res) => {
  res.status(200).json({ success: true, message: "Server is healthy!" });
});

router.get("/health/db", async (req, res, next) => {
  try {
    await query("SELECT 1 AS db");
    res.status(200).json({ success: true, message: "Database is reachable!" });
  } catch (error) {
    next(error);
  }
});

router.get("/role-permissions/me/permissions", authMiddleware, async (req, res, next) => {
  try {
    const roleIds = req.user.roles.map((r) => r.id);
    if (roleIds.length === 0) {
      return successResponse(res, "Permissions fetched", []);
    }
    const placeholders = roleIds.map(() => "?").join(",");
    const permissions = await query(
      `SELECT DISTINCT p.id, p.name, p.module FROM permissions p 
       INNER JOIN role_permissions rp ON p.id = rp.permission_id 
       WHERE rp.role_id IN (${placeholders})`,
      roleIds
    );
    return successResponse(res, "Permissions fetched", permissions);
  } catch (error) {
    next(error);
  }
});

// Module routers registration
router.use("/admin/media", require("../modules/admin-media/routes").admin);
router.use("/auth", authRoutes);
router.use("/roles", rolesRoutes);
router.use("/permissions", permissionsRoutes);
router.use("/users", usersRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/global-content", globalContentRoutes);
router.use("/homepage", homepageRoutes);
router.use("/team", teamRoutes);
router.use("/reorder", reorderRoutes);
router.use("/v1/media", mediaRoutes);
router.use("/gallery", galleryRoutes);
router.use("/gallery-videos", galleryVideoRoutes);
router.use("/gallery/videos", galleryVideoRoutes);
router.use("/media-coverage", mediaCoverageRoutes);
router.use("/facilities", facilitiesRoutes);
router.use("/key-members", keyMembersRoutes);
router.use("/donors", donorsRoutes);
router.use("/blogs", blogsRoutes);
router.use("/news", newsRoutes);
router.use("/contact-enquiries", contactEnquiriesRoutes);
router.use("/donations", require('../modules/donations/donations.routes'));
router.use("/translations", translationsRoutes);
router.use("/documents", documentsRoutes);

module.exports = router;


