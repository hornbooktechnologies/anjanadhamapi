const { query } = require("../../config/database");

const toCount = (value) => Number(value) || 0;

async function getDashboardSummary() {
  const [
    facilityRows,
    bannerRows,
    keyMemberRows,
    blogRows,
    mediaRows,
    photoRows,
    videoRows,
    userRows,
  ] = await Promise.all([
    query(`SELECT
      COUNT(*) AS total,
      COALESCE(SUM(status = 1 OR status = 'active'), 0) AS active
      FROM facilities`).catch(() => [{ total: 0, active: 0 }]),
    query(`SELECT
      COUNT(*) AS total,
      COALESCE(SUM(status = 1 OR status = 'active'), 0) AS active
      FROM homepage_banners`).catch(() => [{ total: 0, active: 0 }]),
    query(`SELECT
      COUNT(*) AS total,
      COALESCE(SUM(status = 1 OR status = 'active'), 0) AS active
      FROM key_members`).catch(() => [{ total: 0, active: 0 }]),
    query(`SELECT
      COUNT(*) AS total,
      COALESCE(SUM(status = 1 OR status = 'active'), 0) AS active
      FROM blogs`).catch(() => [{ total: 0, active: 0 }]),
    query(`SELECT
      COUNT(*) AS total,
      COALESCE(SUM(status = 1 OR status = 'active'), 0) AS active
      FROM media_coverage`).catch(() => [{ total: 0, active: 0 }]),
    query(`SELECT
      COUNT(*) AS total,
      COALESCE(SUM(status = 1 OR status = 'active'), 0) AS active
      FROM gallery`).catch(() => [{ total: 0, active: 0 }]),
    query(`SELECT
      COUNT(*) AS total,
      COALESCE(SUM(status = 1 OR status = 'active'), 0) AS active
      FROM gallery_videos`).catch(() => [{ total: 0, active: 0 }]),
    query(`SELECT
      COUNT(*) AS total,
      COALESCE(SUM(status = 1 OR status = 'active'), 0) AS active
      FROM users`).catch(() => [{ total: 0, active: 0 }]),
  ]);

  const facilities = facilityRows[0] || {};
  const banners = bannerRows[0] || {};
  const keyMembers = keyMemberRows[0] || {};
  const blogs = blogRows[0] || {};
  const media = mediaRows[0] || {};
  const photos = photoRows[0] || {};
  const videos = videoRows[0] || {};
  const users = userRows[0] || {};

  return {
    facilities: {
      total: toCount(facilities.total),
      active: toCount(facilities.active),
    },
    banners: {
      total: toCount(banners.total),
      active: toCount(banners.active),
    },
    keyMembers: {
      total: toCount(keyMembers.total),
      active: toCount(keyMembers.active),
    },
    blogs: {
      total: toCount(blogs.total),
      active: toCount(blogs.active),
    },
    media: {
      total: toCount(media.total),
      active: toCount(media.active),
    },
    photos: {
      total: toCount(photos.total),
      active: toCount(photos.active),
    },
    videos: {
      total: toCount(videos.total),
      active: toCount(videos.active),
    },
    users: {
      total: toCount(users.total),
      active: toCount(users.active),
    },
  };
}

module.exports = { getDashboardSummary };

