const fs = require("fs");
const path = require("path");
const { query, pool } = require("../src/config/database");
const { getUploadTargetDir } = require("../src/utils/uploadStorage");

const COVER_IMAGE_MAP = {
  "EPR & Compliance Ready": "1_new-first-frame.webp",
  "Consistent Batch Quality": "s2-first-frame.webp",
  "Food-Grade Processing Standards": "3-n-first-frame.webp",
  "Deep Material Expertise": "s4-first-frame.webp",
};

async function hasColumn(tableName, columnName) {
  const rows = await query(
    `SELECT COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    [tableName, columnName],
  );

  return rows.length > 0;
}

function copyPosterToUploads(filename) {
  const sourcePath = path.resolve(
    __dirname,
    "../../GDB-Circular-Front/public/asset/home/video-posters",
    filename,
  );

  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Poster asset not found: ${sourcePath}`);
  }

  const targetDir = getUploadTargetDir("homepage/whychoose");
  const targetPath = path.join(targetDir, filename);

  if (!fs.existsSync(targetPath)) {
    fs.copyFileSync(sourcePath, targetPath);
  }

  return `/uploads/homepage/whychoose/${filename}`;
}

async function ensureCoverImageColumn() {
  const columnExists = await hasColumn("homepage_whychoose_cards", "cover_image_url");

  if (!columnExists) {
    await query(
      "ALTER TABLE homepage_whychoose_cards ADD COLUMN cover_image_url TEXT NULL AFTER file_url",
    );
    console.log("[whychoose-backfill] Added cover_image_url column.");
  } else {
    console.log("[whychoose-backfill] cover_image_url column already exists.");
  }
}

async function backfillRows() {
  const rows = await query(
    "SELECT id, card_title, cover_image_url FROM homepage_whychoose_cards ORDER BY sequence ASC, id ASC",
  );

  if (!rows.length) {
    console.log("[whychoose-backfill] No Why Choose card rows found.");
    return;
  }

  let updatedCount = 0;
  let skippedCount = 0;

  for (const row of rows) {
    const mappedPoster = COVER_IMAGE_MAP[row.card_title];

    if (!mappedPoster) {
      console.log(`[whychoose-backfill] Skipped "${row.card_title}" (no mapped poster).`);
      skippedCount += 1;
      continue;
    }

    if (row.cover_image_url) {
      console.log(
        `[whychoose-backfill] Skipped "${row.card_title}" (already has cover image).`,
      );
      skippedCount += 1;
      continue;
    }

    const publicUploadPath = copyPosterToUploads(mappedPoster);

    await query(
      "UPDATE homepage_whychoose_cards SET cover_image_url = ? WHERE id = ?",
      [publicUploadPath, row.id],
    );

    console.log(
      `[whychoose-backfill] Updated "${row.card_title}" -> ${publicUploadPath}`,
    );
    updatedCount += 1;
  }

  console.log(
    `[whychoose-backfill] Complete. Updated ${updatedCount} row(s), skipped ${skippedCount} row(s).`,
  );
}

async function main() {
  try {
    console.log("[whychoose-backfill] Starting backfill...");
    await ensureCoverImageColumn();
    await backfillRows();
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("[whychoose-backfill] Failed:", error);
  process.exit(1);
});
