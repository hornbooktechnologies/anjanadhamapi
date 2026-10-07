const { query } = require("../config/database");

const SEQUENCED_TABLES = new Set([
  "social_links",
  "certificates",
  "faqs",
  "homepage_stats",
  "homepage_process_steps",
  "homepage_whychoose_cards",
  "facilities",
  "facilities_what_we_do_cards",
  "team_members",
  "key_members",
  "team_life_gallery",
  "news_categories",
  "news_content",
  "gallery",
  "gallery_images",
  "gallery_videos",
  "media_coverage",
  "homepage_banners",
]);

const SEQUENCE_SCOPE_COLUMNS = {
  faqs: new Set(["page"]),
  team_members: new Set(["group_name"]),
  team_life_gallery: new Set(["slider_group"]),
};

async function getNextSequence(tableName, scope = {}) {
  if (!SEQUENCED_TABLES.has(tableName)) {
    throw new Error(`Sequence is not configured for table: ${tableName}`);
  }

  const scopeEntries = Object.entries(scope).filter(
    ([, value]) => value !== undefined && value !== null
  );
  const allowedScopeColumns = SEQUENCE_SCOPE_COLUMNS[tableName];

  for (const [column] of scopeEntries) {
    if (!allowedScopeColumns?.has(column)) {
      throw new Error(
        `Sequence scope ${column} is not configured for table: ${tableName}`
      );
    }
  }

  const whereClause = scopeEntries.length
    ? ` WHERE ${scopeEntries.map(([column]) => `${column} = ?`).join(" AND ")}`
    : "";
  const rows = await query(
    `SELECT COALESCE(MAX(sequence), 0) + 1 AS next_sequence FROM ${tableName}${whereClause}`,
    scopeEntries.map(([, value]) => value)
  );

  return Number(rows[0]?.next_sequence || 1);
}

module.exports = { getNextSequence, SEQUENCED_TABLES, SEQUENCE_SCOPE_COLUMNS };
