const { transaction, query } = require("../../config/database");
const AppError = require("../../utils/AppError");

const REORDER_SCOPES = Object.freeze({
  homepage_stats: {
    table: "homepage_stats",
    permission: "homepage.stats.update",
  },
  homepage_process_steps: {
    table: "homepage_process_steps",
    permission: "homepage.process.update",
  },
  homepage_whychoose_cards: {
    table: "homepage_whychoose_cards",
    permission: "homepage.whychoose.update",
  },
  facilities: {
    table: "facilities",
    permission: "facilities.update",
  },
  facilities_what_we_do_cards: {
    table: "facilities_what_we_do_cards",
    permission: "facilities.whatwedo.update",
  },
  certificates: {
    table: "certificates",
    permission: "global.certificates.update",
  },
  faqs: {
    table: "faqs",
    permission: "global.faq.update",
  },
  team_members: {
    table: "team_members",
    permission: "team.members.update",
  },
  key_members: {
    table: "key_members",
    permission: "key_members.update",
  },
  team_life_gallery: {
    table: "team_life_gallery",
    permission: "team.life.update",
  },
  news_categories: {
    table: "news_categories",
    permission: "news.category.update",
  },
  news_content: {
    table: "news_content",
    permission: "news.content.update",
  },
  gallery: {
    table: "gallery",
    permission: "gallery.update",
  },
  gallery_videos: {
    table: "gallery_videos",
    permission: "gallery.update",
  },
  media_coverage: {
    table: "media_coverage",
    permission: "media_coverage.update",
  },
  blogs: {
    table: "blogs",
    permission: "blogs.update",
  },
  homepage_banners: {
    table: "homepage_banners",
    permission: "homepage.banner.update",
  },
});

function normalizeItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError("Reorder items are required.", 400);
  }

  return items.map((item, index) => {
    const id = Number(item?.id);
    const sequence = Number(
      item?.sequence === undefined || item?.sequence === null ? index + 1 : item.sequence,
    );

    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError("Each reorder item must have a valid id.", 400);
    }

    if (!Number.isInteger(sequence) || sequence < 0) {
      throw new AppError("Each reorder item must have a non-negative sequence.", 400);
    }

    return { id, sequence };
  });
}

async function assertScopePermission(user, permissionName) {
  if (!user) {
    throw new AppError("User context not found.", 500);
  }

  const isSuperAdmin = user.roles?.some((role) => role.name === "Super Admin");
  if (isSuperAdmin) {
    return;
  }

  const roleIds = (user.roles || []).map((role) => role.id).filter(Boolean);
  if (!roleIds.length) {
    throw new AppError("You do not have permission to reorder this content.", 403);
  }

  const placeholders = roleIds.map(() => "?").join(",");
  const permissions = await query(
    `SELECT DISTINCT p.name FROM permissions p
     INNER JOIN role_permissions rp ON p.id = rp.permission_id
     WHERE rp.role_id IN (${placeholders})`,
    roleIds,
  );

  const hasPermission = permissions.some((permission) => permission.name === permissionName);
  if (!hasPermission) {
    throw new AppError("You do not have permission to reorder this content.", 403);
  }
}

async function reorderSequence({ scope, items, user }) {
  const config = REORDER_SCOPES[scope];
  if (!config) {
    throw new AppError("Invalid reorder scope.", 400);
  }

  const normalizedItems = normalizeItems(items);
  await assertScopePermission(user, config.permission);

  await transaction(async (connection) => {
    for (const item of normalizedItems) {
      const [result] = await connection.query(
        `UPDATE ${config.table} SET sequence = ? WHERE id = ?`,
        [item.sequence, item.id],
      );

      if (result.affectedRows === 0) {
        throw new AppError(`Reorder item not found: ${item.id}`, 404);
      }
    }
  });

  return normalizedItems;
}

module.exports = {
  REORDER_SCOPES,
  reorderSequence,
};
