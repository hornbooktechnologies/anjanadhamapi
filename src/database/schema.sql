-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Roles Table
CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Permissions Table
CREATE TABLE IF NOT EXISTS permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  module VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Role Permissions Mapping Table
CREATE TABLE IF NOT EXISTS role_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role_id INT NOT NULL,
  permission_id INT NOT NULL,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
  UNIQUE KEY unique_role_permission (role_id, permission_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. User Roles Mapping Table
CREATE TABLE IF NOT EXISTS user_roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  role_id INT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_role (user_id, role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Password Resets Table
CREATE TABLE IF NOT EXISTS password_resets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6A. Login OTP Table
CREATE TABLE IF NOT EXISTS login_otps (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  otp_hash VARCHAR(255) NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  expires_at DATETIME NOT NULL,
  verified_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_login_otps_user_id (user_id),
  INDEX idx_login_otps_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. SEO Content Table
CREATE TABLE IF NOT EXISTS seo_content (
  id INT AUTO_INCREMENT PRIMARY KEY,
  page VARCHAR(255) NOT NULL UNIQUE,
  meta_title VARCHAR(255) NULL,
  meta_description TEXT NULL,
  canonical_url VARCHAR(255) NULL,
  robots_tag VARCHAR(100) NULL,
  og_title VARCHAR(255) NULL,
  og_description TEXT NULL,
  og_image TEXT NULL,
  og_image_alt VARCHAR(255) NULL,
  twitter_title VARCHAR(255) NULL,
  twitter_description TEXT NULL,
  twitter_image TEXT NULL,
  twitter_image_alt VARCHAR(255) NULL,
  schema_type VARCHAR(100) NULL,
  schema_json TEXT NULL,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Contact & Footer Details
CREATE TABLE IF NOT EXISTS contact_details (
  id INT AUTO_INCREMENT PRIMARY KEY,
  phone VARCHAR(50) NULL,
  email VARCHAR(100) NULL,
  address TEXT NULL,
  footer_description TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Social Links Mapping (Child of Contact/Footer)
CREATE TABLE IF NOT EXISTS social_links (
  id INT AUTO_INCREMENT PRIMARY KEY,
  platform_name VARCHAR(100) NOT NULL,
  icon_url TEXT NULL,
  url VARCHAR(255) NOT NULL,
  alt_text VARCHAR(255) NULL,
  sequence INT DEFAULT 0,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. Certificates Table
CREATE TABLE IF NOT EXISTS certificates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  image_url TEXT NULL,
  image_alt VARCHAR(255) NULL,
  link VARCHAR(255) NULL,
  sequence INT DEFAULT 0,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. Common Inquiries Table
CREATE TABLE IF NOT EXISTS inquiries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL,
  mobile VARCHAR(50) NULL,
  company VARCHAR(150) NULL,
  what_brings_you_here VARCHAR(100) NULL,
  message TEXT NULL,
  page_url VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 12. FAQs Table
CREATE TABLE IF NOT EXISTS faqs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  page VARCHAR(100) NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sequence INT DEFAULT 0,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 13. Banners Table
CREATE TABLE IF NOT EXISTS banners (
  id INT AUTO_INCREMENT PRIMARY KEY,
  page VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  file_url TEXT NULL,
  alt_text VARCHAR(255) NULL,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 14. Homepage Stats / Value Strip
CREATE TABLE IF NOT EXISTS homepage_stats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  icon_url TEXT NOT NULL,
  icon_alt VARCHAR(255) NULL,
  value_text VARCHAR(100) NOT NULL,
  sequence INT DEFAULT 0,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 15. Homepage Process Section (singleton header)
CREATE TABLE IF NOT EXISTS homepage_process_section (
  id INT AUTO_INCREMENT PRIMARY KEY,
  section_title VARCHAR(255) NULL,
  section_description TEXT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 16. Homepage Process Steps (CRUD children)
CREATE TABLE IF NOT EXISTS homepage_process_steps (
  id INT AUTO_INCREMENT PRIMARY KEY,
  step_title VARCHAR(255) NOT NULL,
  step_description TEXT NULL,
  file_url TEXT NULL,
  alt_text VARCHAR(255) NULL,
  sequence INT DEFAULT 0,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 17. Homepage Why Choose Section (singleton header)
CREATE TABLE IF NOT EXISTS homepage_whychoose_section (
  id INT AUTO_INCREMENT PRIMARY KEY,
  section_title VARCHAR(255) NULL,
  section_description TEXT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 18. Homepage Why Choose Cards (CRUD children)
CREATE TABLE IF NOT EXISTS homepage_whychoose_cards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  card_title VARCHAR(255) NOT NULL,
  card_description TEXT NULL,
  file_url TEXT NULL,
  cover_image_url TEXT NULL,
  cover_image_alt VARCHAR(255) NULL,
  alt_text VARCHAR(255) NULL,
  sequence INT DEFAULT 0,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 20. Product Catalogue
CREATE TABLE IF NOT EXISTS product_catalogue (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_category ENUM('LDPE', 'HDPE', 'PP') NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  short_description TEXT NULL,
  image_url TEXT NULL,
  image_alt VARCHAR(255) NULL,
  grade_no VARCHAR(100) NULL,
  color VARCHAR(100) NULL,
  density_g_cm3 DECIMAL(10,4) NULL,
  mfi_g_10min DECIMAL(10,4) NULL,
  ash_percent DECIMAL(10,4) NULL,
  fda_lno TINYINT(1) DEFAULT 0,
  pcr_content_percent DECIMAL(10,2) NULL,
  show_on_homepage TINYINT(1) DEFAULT 0,
  sequence INT DEFAULT 0,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 21. Product Quality Assurance Section Header
CREATE TABLE IF NOT EXISTS quality_assurance_section (
  id INT AUTO_INCREMENT PRIMARY KEY,
  section_title VARCHAR(255) NULL,
  section_description TEXT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 22. Product Quality Assurance Cards
CREATE TABLE IF NOT EXISTS quality_assurance_cards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  card_title VARCHAR(255) NOT NULL,
  card_description TEXT NULL,
  icon_url TEXT NULL,
  icon_alt VARCHAR(255) NULL,
  sequence INT DEFAULT 0,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 23. Case Studies
CREATE TABLE IF NOT EXISTS case_studies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  short_description TEXT NULL,
  tag VARCHAR(100) NULL,
  image_url TEXT NULL,
  image_alt VARCHAR(255) NULL,
  description LONGTEXT NULL,
  sources LONGTEXT NULL,
  sequence INT DEFAULT 0,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 24. About GDB - Overview
CREATE TABLE IF NOT EXISTS about_gdb_overview (
  id INT AUTO_INCREMENT PRIMARY KEY,
  description LONGTEXT NOT NULL,
  images JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 25. About GDB - Journey Timeline Section Header (singleton)
CREATE TABLE IF NOT EXISTS about_gdb_journey_timeline_section (
  id INT AUTO_INCREMENT PRIMARY KEY,
  section_title VARCHAR(255) NULL,
  section_description TEXT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 26. About GDB - Journey Timeline Items (CRUD)
CREATE TABLE IF NOT EXISTS about_gdb_journey_timeline_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  year VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  icon_url TEXT NULL,
  icon_alt VARCHAR(255) NULL,
  image_url TEXT NULL,
  image_alt VARCHAR(255) NULL,
  sequence INT DEFAULT 0,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 27. About GDB - Why Brands Choose GDB PCR Section Header (singleton)
CREATE TABLE IF NOT EXISTS about_gdb_why_industry_chooses_section (
  id INT AUTO_INCREMENT PRIMARY KEY,
  section_title VARCHAR(255) NULL,
  section_description TEXT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 28. About GDB - Why Brands Choose GDB PCR Items (CRUD)
CREATE TABLE IF NOT EXISTS about_gdb_why_industry_chooses_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  stat_value VARCHAR(50) NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  sequence INT DEFAULT 0,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 29. Facilities
CREATE TABLE IF NOT EXISTS facilities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  facility_name VARCHAR(255) NOT NULL,
  facility_type ENUM('Headquarter', 'Vishw Anjanadham', 'Anjanadham Campus') NOT NULL,
  is_development TINYINT(1) NOT NULL DEFAULT 0,
  show_on_facility_page TINYINT(1) NOT NULL DEFAULT 0,
  address TEXT NOT NULL,
  phone VARCHAR(50) NOT NULL,
  state VARCHAR(100) NOT NULL,
  latitude VARCHAR(50) NOT NULL,
  longitude VARCHAR(50) NOT NULL,
  image_url TEXT NULL,
  image_alt VARCHAR(255) NOT NULL,
  sequence INT DEFAULT 0,
  status ENUM('active','inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 30. Facilities - What We Do Section
CREATE TABLE IF NOT EXISTS facilities_what_we_do_section (
  id INT AUTO_INCREMENT PRIMARY KEY,
  section_title VARCHAR(255) NULL,
  section_description TEXT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 31. Facilities - What We Do Cards
CREATE TABLE IF NOT EXISTS facilities_what_we_do_cards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  card_title VARCHAR(255) NOT NULL,
  card_description TEXT NULL,
  icon_url TEXT NULL,
  icon_alt VARCHAR(255) NULL,
  sequence INT DEFAULT 0,
  status ENUM('active','inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 32. Team Members
CREATE TABLE IF NOT EXISTS team_groups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL UNIQUE,
  description TEXT NULL,
  sequence INT NOT NULL DEFAULT 0,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS team_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_name VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  designation VARCHAR(255) NOT NULL,
  location VARCHAR(255) NULL,
  photo_url TEXT NOT NULL,
  photo_alt VARCHAR(255) NOT NULL,
  linkedin_url VARCHAR(255) NULL,
  show_on_homepage TINYINT(1) DEFAULT 0,
  sequence INT DEFAULT 0,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 33. Life at Anjanadham Section
CREATE TABLE IF NOT EXISTS team_life_section (
  id INT AUTO_INCREMENT PRIMARY KEY,
  section_title VARCHAR(255) NULL,
  section_description TEXT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 34. Life at Anjanadham Gallery
CREATE TABLE IF NOT EXISTS team_life_gallery (
  id INT AUTO_INCREMENT PRIMARY KEY,
  file_url TEXT NOT NULL,
  media_type ENUM('image') NOT NULL DEFAULT 'image',
  alt_text VARCHAR(255) NOT NULL,
  slider_group TINYINT(1) NOT NULL DEFAULT 1,
  sequence INT DEFAULT 0,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 35. Sellers - Always Buying Section
CREATE TABLE IF NOT EXISTS seller_always_buying (
  id INT AUTO_INCREMENT PRIMARY KEY,
  section_title VARCHAR(255) NOT NULL,
  section_description TEXT NOT NULL,
  file_url TEXT NOT NULL,
  media_type ENUM('image', 'video') NOT NULL,
  alt_text VARCHAR(255) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 35. Sellers - Always Buying Points
CREATE TABLE IF NOT EXISTS seller_purchasing_points (
  id INT AUTO_INCREMENT PRIMARY KEY,
  point_title VARCHAR(255) NOT NULL,
  sequence INT DEFAULT 0,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 36. Sellers - Feedstock Catalogue
CREATE TABLE IF NOT EXISTS seller_feedstock (
  id INT AUTO_INCREMENT PRIMARY KEY,
  feedstock_category ENUM('LDPE', 'HDPE', 'PP', 'Other') NOT NULL,
  material_name VARCHAR(255) NOT NULL,
  short_description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  image_alt VARCHAR(255) NOT NULL,
  sequence INT DEFAULT 0,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 37. Sellers - Logistics Section
CREATE TABLE IF NOT EXISTS seller_logistics_section (
  id INT AUTO_INCREMENT PRIMARY KEY,
  section_title VARCHAR(255) NULL,
  section_description TEXT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 38. Sellers - Logistics Cards
CREATE TABLE IF NOT EXISTS seller_logistics_cards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  card_title VARCHAR(255) NOT NULL,
  card_description TEXT NOT NULL,
  icon_url TEXT NOT NULL,
  icon_alt VARCHAR(255) NULL,
  sequence INT DEFAULT 0,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 39. Sellers - Supplier Inquiries
CREATE TABLE IF NOT EXISTS seller_inquiries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(100) NOT NULL,
  company VARCHAR(150) NULL,
  specs TEXT NULL,
  resin_type ENUM('LDPE', 'HDPE', 'PP') NULL,
  volume VARCHAR(100) NULL,
  application TEXT NULL,
  timeline VARCHAR(100) NULL,
  message TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 40. News Categories
CREATE TABLE IF NOT EXISTS news_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_title VARCHAR(255) NOT NULL,
  sequence INT DEFAULT 0,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 39. News & Updates Content
CREATE TABLE IF NOT EXISTS news_content (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  publish_at DATETIME NULL COMMENT 'Scheduled publication in UTC; date remains the IST calendar date',
  short_description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  image_alt VARCHAR(255) NOT NULL,
  logo_url TEXT NULL,
  logo_alt VARCHAR(255) NULL,
  external_url VARCHAR(255) NULL,
  featured_homepage TINYINT(1) DEFAULT 0,
  featured_listing TINYINT(1) NULL DEFAULT NULL,
  publish_status ENUM('draft', 'published') DEFAULT 'draft',
  sequence INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_news_content_category
    FOREIGN KEY (category_id) REFERENCES news_categories(id) ON DELETE RESTRICT,
  UNIQUE KEY unique_news_featured_listing (featured_listing)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- Registry for UUID-named persistent admin images.
CREATE TABLE IF NOT EXISTS admin_media_admins (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    user_id INT NULL UNIQUE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS admin_media (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    filename VARCHAR(41) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
    mime_type VARCHAR(32) NOT NULL,
    bytes INT UNSIGNED NOT NULL,
    width INT UNSIGNED NOT NULL,
    height INT UNSIGNED NOT NULL,
    sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    uploaded_by_uuid CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    alt_text VARCHAR(300) NOT NULL DEFAULT '',
    status ENUM('published','deleting','deleted') NOT NULL DEFAULT 'published',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cleanup_after DATETIME NULL,
    deleted_at DATETIME NULL,
    INDEX media_cleanup (status, cleanup_after),
    FOREIGN KEY (uploaded_by_uuid) REFERENCES admin_media_admins(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
