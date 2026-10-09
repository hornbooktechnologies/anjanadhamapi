const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const { query, transaction } = require("../config/database");
const { ensureAnnouncementSchedule } = require("../modules/news/news.schedule");

async function hasColumn(tableName, columnName) {
  const rows = await query(
    `SELECT COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );
  return rows.length > 0;
}

async function hasTable(tableName) {
  const rows = await query(
    `SELECT TABLE_NAME
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?`,
    [tableName]
  );
  return rows.length > 0;
}

async function hasIndex(tableName, indexName) {
  const rows = await query(
    `SELECT INDEX_NAME
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND INDEX_NAME = ?`,
    [tableName, indexName]
  );
  return rows.length > 0;
}

async function getColumnType(tableName, columnName) {
  const rows = await query(
    `SELECT COLUMN_TYPE
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [tableName, columnName]
  );
  return rows[0]?.COLUMN_TYPE || "";
}

async function getForeignKeyDetails(tableName, columnName, referencedTableName) {
  const rows = await query(
    `SELECT kcu.CONSTRAINT_NAME, rc.DELETE_RULE
     FROM information_schema.KEY_COLUMN_USAGE kcu
     INNER JOIN information_schema.REFERENTIAL_CONSTRAINTS rc
       ON rc.CONSTRAINT_SCHEMA = kcu.CONSTRAINT_SCHEMA
      AND rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
      AND rc.TABLE_NAME = kcu.TABLE_NAME
     WHERE kcu.CONSTRAINT_SCHEMA = DATABASE()
       AND kcu.TABLE_NAME = ?
       AND kcu.COLUMN_NAME = ?
       AND kcu.REFERENCED_TABLE_NAME = ?
     LIMIT 1`,
    [tableName, columnName, referencedTableName]
  );
  return rows[0] || null;
}

async function migrate() {
  console.log("Starting database migrations...");

  try {
    // 1. Read and execute schema SQL
    const schemaPath = path.join(__dirname, "schema.sql");
    const schemaSql = fs.readFileSync(schemaPath, "utf8");

    // Split SQL by semicolon and filter empty commands
    const commands = schemaSql
      .split(";")
      .map((cmd) => cmd.trim())
      .filter((cmd) => cmd.length > 0);

    for (const cmd of commands) {
      await query(cmd);
    }

    if (await hasColumn("inquiries", "whatsapp_number")) {
      await query("ALTER TABLE inquiries DROP COLUMN whatsapp_number");
    }
    if (!(await hasColumn("inquiries", "what_brings_you_here"))) {
      await query("ALTER TABLE inquiries ADD COLUMN what_brings_you_here VARCHAR(100) NULL AFTER company");
    }
    if (await hasColumn("inquiries", "mobile")) {
      await query("ALTER TABLE inquiries MODIFY COLUMN mobile VARCHAR(50) NULL");
    }

    if (await hasColumn("banners", "cta_button_name")) {
      await query("ALTER TABLE banners DROP COLUMN cta_button_name");
    }
    if (await hasColumn("banners", "cta_button_link")) {
      await query("ALTER TABLE banners DROP COLUMN cta_button_link");
    }
    if (await hasColumn("banners", "sequence")) {
      await query("ALTER TABLE banners DROP COLUMN sequence");
    }
    if (await hasColumn("faqs", "faq_schema")) {
      await query("ALTER TABLE faqs DROP COLUMN faq_schema");
    }
    if (await hasColumn("about_gdb_overview", "status")) {
      await query("ALTER TABLE about_gdb_overview DROP COLUMN status");
    }
    if (await hasTable("faqs")) {
      await query("UPDATE faqs SET page = 'product-listing' WHERE page = 'products'");
      await query("UPDATE faqs SET page = 'seller' WHERE page = 'sellers'");
    }
    if (!(await hasColumn("seo_content", "twitter_image_alt"))) {
      await query("ALTER TABLE seo_content ADD COLUMN twitter_image_alt VARCHAR(255) NULL AFTER twitter_image");
    }

    if (await hasTable("homepage_products_cards")) {
      await query("DROP TABLE homepage_products_cards");
    }
    if (await hasTable("homepage_products_section")) {
      await query("DROP TABLE homepage_products_section");
    }

    if (!(await hasColumn("product_catalogue", "grade_no"))) {
      await query("ALTER TABLE product_catalogue ADD COLUMN grade_no VARCHAR(100) NULL AFTER image_alt");
    }
    if (!(await hasColumn("product_catalogue", "color"))) {
      await query("ALTER TABLE product_catalogue ADD COLUMN color VARCHAR(100) NULL AFTER grade_no");
    }
    if (!(await hasColumn("product_catalogue", "density_g_cm3"))) {
      await query("ALTER TABLE product_catalogue ADD COLUMN density_g_cm3 DECIMAL(10,4) NULL AFTER color");
    }
    if (!(await hasColumn("product_catalogue", "mfi_g_10min"))) {
      await query("ALTER TABLE product_catalogue ADD COLUMN mfi_g_10min DECIMAL(10,4) NULL AFTER density_g_cm3");
    }
    if (!(await hasColumn("product_catalogue", "ash_percent"))) {
      await query("ALTER TABLE product_catalogue ADD COLUMN ash_percent DECIMAL(10,4) NULL AFTER mfi_g_10min");
    }
    if (!(await hasColumn("product_catalogue", "fda_lno"))) {
      await query("ALTER TABLE product_catalogue ADD COLUMN fda_lno TINYINT(1) DEFAULT 0 AFTER ash_percent");
    }
    if (!(await hasColumn("product_catalogue", "pcr_content_percent"))) {
      await query("ALTER TABLE product_catalogue ADD COLUMN pcr_content_percent DECIMAL(10,2) NULL AFTER fda_lno");
    }
    if (await hasColumn("product_catalogue", "pdf_url")) {
      await query("ALTER TABLE product_catalogue DROP COLUMN pdf_url");
    }

    if (!(await hasTable("quality_assurance_section"))) {
      await query(
        `CREATE TABLE quality_assurance_section (
          id INT AUTO_INCREMENT PRIMARY KEY,
          section_title VARCHAR(255) NULL,
          section_description TEXT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
      );
    }
    if (!(await hasTable("quality_assurance_cards"))) {
      await query(
        `CREATE TABLE quality_assurance_cards (
          id INT AUTO_INCREMENT PRIMARY KEY,
          card_title VARCHAR(255) NOT NULL,
          card_description TEXT NULL,
          icon_url TEXT NULL,
          icon_alt VARCHAR(255) NULL,
          sequence INT DEFAULT 0,
          status ENUM('active', 'inactive') DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
      );
    }
    if (!(await hasColumn("homepage_whychoose_cards", "cover_image_url"))) {
      await query("ALTER TABLE homepage_whychoose_cards ADD COLUMN cover_image_url TEXT NULL AFTER file_url");
    }
    if (!(await hasColumn("homepage_whychoose_cards", "cover_image_alt"))) {
      await query("ALTER TABLE homepage_whychoose_cards ADD COLUMN cover_image_alt VARCHAR(255) NULL AFTER cover_image_url");
    }
    if (await hasTable("logistics_support_section")) {
      await query("DROP TABLE logistics_support_section");
    }
    if (await hasTable("logistics_support_cards")) {
      await query("DROP TABLE logistics_support_cards");
    }

    if (!(await hasColumn("case_studies", "tag"))) {
      await query("ALTER TABLE case_studies ADD COLUMN tag VARCHAR(100) NULL AFTER short_description");
    }
    if (!(await hasColumn("case_studies", "description"))) {
      await query("ALTER TABLE case_studies ADD COLUMN description LONGTEXT NULL AFTER image_alt");
    }
    if (!(await hasColumn("case_studies", "sources"))) {
      await query("ALTER TABLE case_studies ADD COLUMN sources LONGTEXT NULL AFTER description");
    }
    if (await hasColumn("case_studies", "full_description")) {
      await query("UPDATE case_studies SET description = COALESCE(description, full_description)");
      await query("ALTER TABLE case_studies DROP COLUMN full_description");
    }

    if (!(await hasColumn("about_gdb_journey_timeline_items", "icon_url"))) {
      await query("ALTER TABLE about_gdb_journey_timeline_items ADD COLUMN icon_url TEXT NULL AFTER description");
    }
    if (!(await hasColumn("about_gdb_journey_timeline_items", "icon_alt"))) {
      await query("ALTER TABLE about_gdb_journey_timeline_items ADD COLUMN icon_alt VARCHAR(255) NULL AFTER icon_url");
    }
    if (!(await hasColumn("about_gdb_journey_timeline_items", "image_url"))) {
      await query("ALTER TABLE about_gdb_journey_timeline_items ADD COLUMN image_url TEXT NULL AFTER icon_alt");
    }
    if (!(await hasColumn("about_gdb_journey_timeline_items", "image_alt"))) {
      await query("ALTER TABLE about_gdb_journey_timeline_items ADD COLUMN image_alt VARCHAR(255) NULL AFTER image_url");
    }
    if (await hasColumn("about_gdb_journey_timeline_items", "file_url")) {
      await query("UPDATE about_gdb_journey_timeline_items SET image_url = COALESCE(image_url, file_url), image_alt = COALESCE(image_alt, alt_text)");
      await query("ALTER TABLE about_gdb_journey_timeline_items DROP COLUMN file_url");
    }
    if (await hasColumn("about_gdb_journey_timeline_items", "alt_text")) {
      await query("ALTER TABLE about_gdb_journey_timeline_items DROP COLUMN alt_text");
    }

    if (!(await hasTable("team_life_section"))) {
      await query(
        `CREATE TABLE team_life_section (
          id INT AUTO_INCREMENT PRIMARY KEY,
          section_title VARCHAR(255) NULL,
          section_description TEXT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
      );
    }
    if (!(await hasColumn("team_life_gallery", "slider_group"))) {
      await query("ALTER TABLE team_life_gallery ADD COLUMN slider_group TINYINT(1) NOT NULL DEFAULT 1 AFTER alt_text");
      await query(
        `UPDATE team_life_gallery
         SET slider_group = CASE WHEN MOD(sequence, 2) = 0 THEN 2 ELSE 1 END`
      );
    }
    const hasLifeGalleryTitle = await hasColumn("team_life_gallery", "section_title");
    const hasLifeGalleryDescription = await hasColumn("team_life_gallery", "description");
    if (hasLifeGalleryTitle || hasLifeGalleryDescription) {
      const existingLifeSection = await query("SELECT id FROM team_life_section LIMIT 1");
      if (!existingLifeSection.length && hasLifeGalleryTitle && hasLifeGalleryDescription) {
        const legacyLifeRows = await query(
          `SELECT section_title, description
           FROM team_life_gallery
           WHERE section_title IS NOT NULL OR description IS NOT NULL
           ORDER BY sequence ASC, id ASC
           LIMIT 1`
        );
        if (legacyLifeRows.length) {
          await query(
            "INSERT INTO team_life_section (section_title, section_description) VALUES (?, ?)",
            [legacyLifeRows[0].section_title || null, legacyLifeRows[0].description || null]
          );
        }
      }
      if (hasLifeGalleryDescription) {
        await query("ALTER TABLE team_life_gallery DROP COLUMN description");
      }
      if (hasLifeGalleryTitle) {
        await query("ALTER TABLE team_life_gallery DROP COLUMN section_title");
      }
    }
    if ((await getColumnType("team_life_gallery", "media_type")).includes("video")) {
      await query("UPDATE team_life_gallery SET media_type = 'image' WHERE media_type <> 'image'");
      await query("ALTER TABLE team_life_gallery MODIFY COLUMN media_type ENUM('image') NOT NULL DEFAULT 'image'");
    }
    const lifeGalleryRows = await query(
      "SELECT id, slider_group FROM team_life_gallery ORDER BY slider_group ASC, sequence ASC, id ASC"
    );
    const lifeSequenceBySlider = {};
    for (const row of lifeGalleryRows) {
      const sliderGroup = Number(row.slider_group) === 2 ? 2 : 1;
      lifeSequenceBySlider[sliderGroup] = (lifeSequenceBySlider[sliderGroup] || 0) + 1;
      await query("UPDATE team_life_gallery SET sequence = ? WHERE id = ?", [
        lifeSequenceBySlider[sliderGroup],
        row.id,
      ]);
    }

    const hasFacilityType = await hasColumn("facilities", "facility_type");
    if (hasFacilityType) {
      const facilityTypeColumns = await query(
        `SELECT COLUMN_TYPE
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'facilities'
           AND COLUMN_NAME = 'facility_type'`
      );
      if (!facilityTypeColumns[0]?.COLUMN_TYPE?.includes("Vishw Anjanadham")) {
        await query("ALTER TABLE facilities MODIFY COLUMN facility_type ENUM('GDB International', 'Headquarter', 'GDB Circular', 'GDB Paint & Coatings', 'Vishw Anjanadham', 'Anjanadham Campus') NOT NULL");
        await query("UPDATE facilities SET facility_type = 'Headquarter' WHERE facility_type = 'GDB International'");
        await query("UPDATE facilities SET facility_type = 'Vishw Anjanadham' WHERE facility_type = 'GDB Circular'");
        await query("UPDATE facilities SET facility_type = 'Anjanadham Campus' WHERE facility_type = 'GDB Paint & Coatings'");
        await query("ALTER TABLE facilities MODIFY COLUMN facility_type ENUM('Headquarter', 'Vishw Anjanadham', 'Anjanadham Campus') NOT NULL");
      }
      if (!(await hasColumn("facilities", "is_development"))) {
        await query("ALTER TABLE facilities ADD COLUMN is_development TINYINT(1) NOT NULL DEFAULT 0 AFTER facility_type");
      }
      if (!(await hasColumn("facilities", "show_on_facility_page"))) {
        await query("ALTER TABLE facilities ADD COLUMN show_on_facility_page TINYINT(1) NOT NULL DEFAULT 0 AFTER is_development");
      }
    }    if (!(await hasTable("facilities_what_we_do_section"))) {
      await query(
        `CREATE TABLE facilities_what_we_do_section (
          id INT AUTO_INCREMENT PRIMARY KEY,
          section_title VARCHAR(255) NULL,
          section_description TEXT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
      );
    }
    if (!(await hasTable("facilities_what_we_do_cards"))) {
      await query(
        `CREATE TABLE facilities_what_we_do_cards (
          id INT AUTO_INCREMENT PRIMARY KEY,
          card_title VARCHAR(255) NOT NULL,
          card_description TEXT NULL,
          icon_url TEXT NULL,
          icon_alt VARCHAR(255) NULL,
          sequence INT DEFAULT 0,
          status ENUM('active','inactive') DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
      );
    }

    await query("ALTER TABLE seller_feedstock MODIFY COLUMN feedstock_category ENUM('LDPE', 'HDPE', 'PP', 'Other') NOT NULL");
    if (await hasColumn("seller_feedstock", "pdf_url")) {
      await query("ALTER TABLE seller_feedstock DROP COLUMN pdf_url");
    }
    if (!(await hasTable("seller_logistics_section"))) {
      await query(
        `CREATE TABLE seller_logistics_section (
          id INT AUTO_INCREMENT PRIMARY KEY,
          section_title VARCHAR(255) NULL,
          section_description TEXT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
      );
    }
    if (!(await hasTable("seller_logistics_cards"))) {
      await query(
        `CREATE TABLE seller_logistics_cards (
          id INT AUTO_INCREMENT PRIMARY KEY,
          card_title VARCHAR(255) NOT NULL,
          card_description TEXT NOT NULL,
          icon_url TEXT NOT NULL,
          icon_alt VARCHAR(255) NULL,
          sequence INT DEFAULT 0,
          status ENUM('active', 'inactive') DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
      );
    }

    if (!(await hasColumn("seller_inquiries", "name"))) {
      await query("ALTER TABLE seller_inquiries ADD COLUMN name VARCHAR(255) NULL FIRST");
      if (await hasColumn("seller_inquiries", "first_name") && await hasColumn("seller_inquiries", "last_name")) {
        await query("UPDATE seller_inquiries SET name = TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')))");
      }
    }
    if (!(await hasColumn("seller_inquiries", "timeline"))) {
      await query("ALTER TABLE seller_inquiries ADD COLUMN timeline VARCHAR(100) NULL AFTER application");
    }
    if (await hasColumn("seller_inquiries", "name")) {
      await query("ALTER TABLE seller_inquiries MODIFY COLUMN name VARCHAR(255) NOT NULL");
    }
    if (await hasColumn("seller_inquiries", "resin_type")) {
      await query("ALTER TABLE seller_inquiries MODIFY COLUMN resin_type ENUM('LDPE', 'HDPE', 'PP') NULL");
    }
    if (await hasColumn("seller_inquiries", "volume")) {
      await query("ALTER TABLE seller_inquiries MODIFY COLUMN volume VARCHAR(100) NULL");
    }
    for (const column of ["first_name", "last_name", "mobile", "page_url"]) {
      if (await hasColumn("seller_inquiries", column)) {
        await query(`ALTER TABLE seller_inquiries DROP COLUMN ${column}`);
      }
    }

    await ensureAnnouncementSchedule();
    if (await hasColumn("news_categories", "category_type")) {
      await query("ALTER TABLE news_categories DROP COLUMN category_type");
    }
    if (await hasColumn("news_categories", "visibility")) {
      await query(
        `UPDATE news_categories c
         SET c.status = 'inactive'
         WHERE c.visibility = 0
           AND NOT EXISTS (
             SELECT 1 FROM news_content n WHERE n.category_id = c.id
           )`
      );
      await query("ALTER TABLE news_categories DROP COLUMN visibility");
    }
    const newsCategoryForeignKey = await getForeignKeyDetails(
      "news_content",
      "category_id",
      "news_categories"
    );
    if (
      newsCategoryForeignKey &&
      !["RESTRICT", "NO ACTION"].includes(newsCategoryForeignKey.DELETE_RULE)
    ) {
      if (!/^[A-Za-z0-9_$]+$/.test(newsCategoryForeignKey.CONSTRAINT_NAME)) {
        throw new Error("Unexpected news category foreign key name");
      }
      await query(
        `ALTER TABLE news_content DROP FOREIGN KEY \`${newsCategoryForeignKey.CONSTRAINT_NAME}\``
      );
      await query(
        `ALTER TABLE news_content
         ADD CONSTRAINT fk_news_content_category
         FOREIGN KEY (category_id) REFERENCES news_categories(id) ON DELETE RESTRICT`
      );
    }
    if (!(await hasColumn("news_content", "logo_url"))) {
      await query("ALTER TABLE news_content ADD COLUMN logo_url TEXT NULL AFTER image_alt");
    }
    if (!(await hasColumn("news_content", "logo_alt"))) {
      await query("ALTER TABLE news_content ADD COLUMN logo_alt VARCHAR(255) NULL AFTER logo_url");
    }
    if (!(await hasColumn("news_content", "featured_listing"))) {
      await query("ALTER TABLE news_content ADD COLUMN featured_listing TINYINT(1) NULL DEFAULT NULL AFTER featured_homepage");
    }
    await query("UPDATE news_content SET featured_listing = NULL WHERE featured_listing = 0");
    await query(
      `UPDATE news_content
       SET featured_listing = NULL
       WHERE featured_listing = 1
         AND id <> (
           SELECT keep_id
           FROM (SELECT MIN(id) AS keep_id FROM news_content WHERE featured_listing = 1) AS selected_article
         )`
    );
    if (!(await hasIndex("news_content", "unique_news_featured_listing"))) {
      await query("ALTER TABLE news_content ADD UNIQUE KEY unique_news_featured_listing (featured_listing)");
    }
    console.log("Database schema applied successfully.");

    // 2. Insert seed data
    console.log("Seeding default data...");
    await transaction(async (connection) => {
      // Create Super Admin role
      const [roleResult] = await connection.execute(
        "INSERT INTO roles (name, description) VALUES (?, ?) ON DUPLICATE KEY UPDATE name=name",
        ["Super Admin", "Full access to the system"]
      );

      // Get Super Admin role ID
      const [roles] = await connection.execute(
        "SELECT id FROM roles WHERE name = ?",
        ["Super Admin"]
      );
      const superAdminRoleId = roles[0].id;

      // Define default permissions
      const defaultPermissions = [
        ...["view", "create", "update", "delete"].map(action => ({ name: `news.category.${action}`, module: "news" })),
        ...["view", "create", "update", "delete", "publish"].map(action => ({ name: `news.content.${action}`, module: "news" })),
        { name: "dashboard.view", module: "dashboard" },
        { name: "user.create", module: "users" },
        { name: "user.read", module: "users" },
        { name: "user.update", module: "users" },
        { name: "user.delete", module: "users" },
        { name: "role.read", module: "roles" },
        { name: "role.create", module: "roles" },
        { name: "role.update", module: "roles" },
        { name: "role.delete", module: "roles" },
        { name: "permission.manage", module: "permissions" },
        // Global Content permissions
        { name: "global.seo.view", module: "globalContent" },
        { name: "global.seo.create", module: "globalContent" },
        { name: "global.seo.update", module: "globalContent" },
        { name: "global.seo.delete", module: "globalContent" },
        { name: "global.footer.view", module: "globalContent" },
        { name: "global.footer.update", module: "globalContent" },
        { name: "global.banner.view", module: "globalContent" },
        { name: "global.banner.update", module: "globalContent" },
        // Homepage Management permissions
        { name: "homepage.stats.view", module: "homepage" },
        { name: "homepage.stats.create", module: "homepage" },
        { name: "homepage.stats.update", module: "homepage" },
        { name: "homepage.stats.delete", module: "homepage" },
        { name: "homepage.process.view", module: "homepage" },
        { name: "homepage.process.create", module: "homepage" },
        { name: "homepage.process.update", module: "homepage" },
        { name: "homepage.process.delete", module: "homepage" },
        { name: "homepage.whychoose.view", module: "homepage" },
        { name: "homepage.whychoose.create", module: "homepage" },
        { name: "homepage.whychoose.update", module: "homepage" },
        { name: "homepage.whychoose.delete", module: "homepage" },
        // About GDB permissions
        { name: "about.overview.view", module: "about" },
        { name: "about.overview.update", module: "about" },
        { name: "about.timeline.view", module: "about" },
        { name: "about.timeline.create", module: "about" },
        { name: "about.timeline.update", module: "about" },
        { name: "about.timeline.delete", module: "about" },
        { name: "about.industry.view", module: "about" },
        { name: "about.industry.create", module: "about" },
        { name: "about.industry.update", module: "about" },
        { name: "about.industry.delete", module: "about" },
        // Team permissions
        { name: "team.members.view", module: "team" },
        { name: "team.members.create", module: "team" },
        { name: "team.members.update", module: "team" },
        { name: "team.members.delete", module: "team" },
        { name: "team.life.view", module: "team" },
        { name: "team.life.create", module: "team" },
        { name: "team.life.update", module: "team" },
        { name: "team.life.delete", module: "team" },
      ];

      for (const perm of defaultPermissions) {
        await connection.execute(
          "INSERT INTO permissions (name, module) VALUES (?, ?) ON DUPLICATE KEY UPDATE name=name",
          [perm.name, perm.module]
        );
      }

      await connection.execute(
        "DELETE FROM permissions WHERE name IN (?, ?, ?, ?, ?, ?, ?, ?)",
        [
          "homepage.products.view",
          "homepage.products.create",
          "homepage.products.update",
          "homepage.products.delete",
          "global.banner.create",
          "global.banner.delete",
          "media.rules.view",
          "media.rules.update",
        ]
      );

      await connection.execute(
        "DELETE FROM permissions WHERE module IN (?, ?, ?) OR name LIKE ? OR name LIKE ? OR name LIKE ?",
        ["product", "sellers", "facilities", "product.%", "seller.%", "facilities.%"]
      );

      await connection.execute(
        "DELETE FROM permissions WHERE name LIKE ? OR name LIKE ?",
        ["global.certificates.%", "global.faq.%"]
      );

      // Map all permissions to Super Admin role
      const [permissions] = await connection.execute("SELECT id FROM permissions");
      for (const perm of permissions) {
        await connection.execute(
          "INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE role_id=role_id",
          [superAdminRoleId, perm.id]
        );
      }



      const adminUsers = [
        { name: "Super Admin", email: "admin@anjanadham.com" },
        { name: "Mehul Panchal", email: "panchal.mehul6015@gmail.com" },
      ];

      for (const adminUser of adminUsers) {
        const [existingUsers] = await connection.execute(
          "SELECT id FROM users WHERE email = ?",
          [adminUser.email]
        );

        let adminUserId;
        if (existingUsers.length === 0) {
          const hashedPassword = await bcrypt.hash("admin@123", 10);
          const [userResult] = await connection.execute(
            "INSERT INTO users (name, email, password, status) VALUES (?, ?, ?, ?)",
            [adminUser.name, adminUser.email, hashedPassword, "active"]
          );
          adminUserId = userResult.insertId;
          console.log(`Admin user created: ${adminUser.email} / admin@123`);
        } else {
          adminUserId = existingUsers[0].id;
          console.log(`Admin user already exists: ${adminUser.email}. Existing password preserved.`);
        }

        await connection.execute(
          "INSERT INTO user_roles (user_id, role_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE role_id=role_id",
          [adminUserId, superAdminRoleId]
        );
      }
    });

    console.log("Database seeded successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrate();



