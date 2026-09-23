const { query, transaction } = require("../../config/database");
const AppError = require("../../utils/AppError");
const { uploadBase64File, deleteStoredFile } = require("../../utils/fileUpload");
const { sendMail } = require("../../utils/mailer");
const { getNextSequence } = require("../../utils/sequence");

function parseSchemaJson(schemaJson) {
  const trimmed = typeof schemaJson === "string" ? schemaJson.trim() : "";
  if (!trimmed) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (_) {
    return [];
  }
}

function normalizeSeoSchemaInput(data) {
  if (Array.isArray(data.schema_entries)) {
    const normalizedEntries = data.schema_entries
      .map((entry) => {
        const schemaType = typeof entry?.schema_type === "string" ? entry.schema_type.trim() : "";
        let rawJson = "";

        if (typeof entry?.schema_json === "string") {
          rawJson = entry.schema_json.trim();
        } else if (entry?.schema_json && typeof entry.schema_json === "object") {
          rawJson = JSON.stringify(entry.schema_json, null, 2);
        }

        if (!schemaType && !rawJson) {
          return null;
        }

        return {
          schema_type: schemaType,
          schema_json: rawJson,
        };
      })
      .filter(Boolean);

    if (!normalizedEntries.length) {
      return { schema_type: "", schema_json: "" };
    }

    const parsedItems = normalizedEntries.map((entry) => JSON.parse(entry.schema_json));
    const schemaTypes = [...new Set(normalizedEntries.map((entry) => entry.schema_type).filter(Boolean))].join(", ");

    return {
      schema_type: schemaTypes,
      schema_json:
        parsedItems.length === 1
          ? JSON.stringify(parsedItems[0], null, 2)
          : JSON.stringify(parsedItems, null, 2),
    };
  }

  return {
    schema_type: data.schema_type || "",
    schema_json: data.schema_json || "",
  };
}

function attachParsedSchema(entry) {
  if (!entry) {
    return entry;
  }

  return {
    ...entry,
    schema_items: parseSchemaJson(entry.schema_json),
  };
}

// ==========================================
// 1. SEO & AIEO Services
// ==========================================
async function getAllSeoContent() {
  const rows = await query("SELECT * FROM seo_content ORDER BY id DESC");
  return rows.map(attachParsedSchema);
}

async function getSeoByPage(page) {
  const results = await query("SELECT * FROM seo_content WHERE page = ?", [page]);
  return attachParsedSchema(results[0] || null);
}

async function getSeoById(id) {
  const results = await query("SELECT * FROM seo_content WHERE id = ?", [id]);
  return attachParsedSchema(results[0] || null);
}

async function createOrUpdateSeo(data) {
  const normalizedSchema = normalizeSeoSchemaInput(data);
  const {
    page,
    meta_title,
    meta_description,
    canonical_url,
    robots_tag,
    og_title,
    og_description,
    og_image,
    og_image_alt,
    twitter_title,
    twitter_description,
    twitter_image,
    twitter_image_alt,
    status = "active",
  } = data;

  // Handle file uploads if base64 data strings are supplied
  let savedOgImage = og_image;
  if (og_image && og_image.startsWith("data:")) {
    savedOgImage = await uploadBase64File(og_image, "seo");
  }

  let savedTwitterImage = twitter_image;
  if (twitter_image && twitter_image.startsWith("data:")) {
    savedTwitterImage = await uploadBase64File(twitter_image, "seo");
  }

  const existing = await query("SELECT id FROM seo_content WHERE page = ?", [page]);

  if (existing.length > 0) {
    await query(
      `UPDATE seo_content 
       SET meta_title = ?, meta_description = ?, canonical_url = ?, robots_tag = ?, 
           og_title = ?, og_description = ?, og_image = ?, og_image_alt = ?, 
           twitter_title = ?, twitter_description = ?, twitter_image = ?, twitter_image_alt = ?,
           schema_type = ?, schema_json = ?, status = ? 
       WHERE page = ?`,
      [
        meta_title,
        meta_description,
        canonical_url,
        robots_tag,
        og_title,
        og_description,
        savedOgImage,
        og_image_alt,
        twitter_title,
        twitter_description,
        savedTwitterImage,
        twitter_image_alt,
        normalizedSchema.schema_type,
        normalizedSchema.schema_json,
        status,
        page,
      ]
    );
    return await getSeoByPage(page);
  } else {
    const result = await query(
      `INSERT INTO seo_content 
       (page, meta_title, meta_description, canonical_url, robots_tag, 
        og_title, og_description, og_image, og_image_alt, 
        twitter_title, twitter_description, twitter_image, twitter_image_alt,
        schema_type, schema_json, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        page,
        meta_title,
        meta_description,
        canonical_url,
        robots_tag,
        og_title,
        og_description,
        savedOgImage,
        og_image_alt,
        twitter_title,
        twitter_description,
        savedTwitterImage,
        twitter_image_alt,
        normalizedSchema.schema_type,
        normalizedSchema.schema_json,
        status,
      ]
    );
    return await getSeoByPage(page);
  }
}

async function deleteSeo(id) {
  const result = await query("SELECT id FROM seo_content WHERE id = ?", [id]);
  if (result.length === 0) throw new AppError("SEO content not found", 404);
  await query("DELETE FROM seo_content WHERE id = ?", [id]);
}

async function updateSeoById(id, data) {
  const existing = await query("SELECT id FROM seo_content WHERE id = ?", [id]);
  if (existing.length === 0) throw new AppError("SEO content not found", 404);

  const normalizedSchema = normalizeSeoSchemaInput(data);
  const {
    page,
    meta_title,
    meta_description,
    canonical_url,
    robots_tag,
    og_title,
    og_description,
    og_image,
    og_image_alt,
    twitter_title,
    twitter_description,
    twitter_image,
    twitter_image_alt,
    status = "active",
  } = data;

  let savedOgImage = og_image;
  if (og_image && og_image.startsWith("data:")) {
    savedOgImage = await uploadBase64File(og_image, "seo");
  }

  let savedTwitterImage = twitter_image;
  if (twitter_image && twitter_image.startsWith("data:")) {
    savedTwitterImage = await uploadBase64File(twitter_image, "seo");
  }

  await query(
    `UPDATE seo_content 
     SET page = ?, meta_title = ?, meta_description = ?, canonical_url = ?, robots_tag = ?, 
         og_title = ?, og_description = ?, og_image = ?, og_image_alt = ?, 
         twitter_title = ?, twitter_description = ?, twitter_image = ?, twitter_image_alt = ?,
         schema_type = ?, schema_json = ?, status = ? 
     WHERE id = ?`,
    [
      page,
      meta_title,
      meta_description,
      canonical_url,
      robots_tag,
      og_title,
      og_description,
      savedOgImage,
      og_image_alt,
      twitter_title,
      twitter_description,
      savedTwitterImage,
      twitter_image_alt,
      normalizedSchema.schema_type,
      normalizedSchema.schema_json,
      status,
      id,
    ]
  );
  return await getSeoById(id);
}

// ==========================================
// 2. Contact / Footer details Services
// ==========================================
async function getFooterDetails() {
  const details = await query("SELECT * FROM contact_details LIMIT 1");
  const socialLinks = await query("SELECT * FROM social_links ORDER BY sequence ASC");
  return {
    contact: details[0] || { phone: "", email: "", address: "", footer_description: "" },
    socialLinks,
  };
}

async function updateFooterDetails(data) {
  const { phone, email, address, footer_description, socialLinks = [] } = data;

  return await transaction(async (connection) => {
    // 1. Insert or update contact details
    const [detailsCheck] = await connection.execute("SELECT id FROM contact_details LIMIT 1");
    if (detailsCheck.length > 0) {
      await connection.execute(
        "UPDATE contact_details SET phone = ?, email = ?, address = ?, footer_description = ? WHERE id = ?",
        [phone, email, address, footer_description, detailsCheck[0].id]
      );
    } else {
      await connection.execute(
        "INSERT INTO contact_details (phone, email, address, footer_description) VALUES (?, ?, ?, ?)",
        [phone, email, address, footer_description]
      );
    }

    // 2. Handle social links CRUD
    // For each social link, if it has an id, update it. If not, insert it.
    // Also, track IDs of active social links to delete removed ones.
    const activeIds = [];
    const [sequenceRows] = await connection.execute(
      "SELECT COALESCE(MAX(sequence), 0) + 1 AS next_sequence FROM social_links"
    );
    let nextSocialSequence = Number(sequenceRows[0]?.next_sequence || 1);

    for (const link of socialLinks) {
      let iconUrl = link.icon_url;
      if (iconUrl && iconUrl.startsWith("data:")) {
        iconUrl = await uploadBase64File(iconUrl, "social");
      }

      if (link.id) {
        await connection.execute(
          `UPDATE social_links 
           SET platform_name = ?, icon_url = ?, url = ?, alt_text = ?, sequence = ?, status = ? 
           WHERE id = ?`,
          [
            link.platform_name,
            iconUrl,
            link.url,
            link.alt_text,
            link.sequence || 0,
            link.status || "active",
            link.id,
          ]
        );
        activeIds.push(link.id);
      } else {
        const [result] = await connection.execute(
          `INSERT INTO social_links 
           (platform_name, icon_url, url, alt_text, sequence, status) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            link.platform_name,
            iconUrl,
            link.url,
            link.alt_text,
            nextSocialSequence++,
            link.status || "active",
          ]
        );
        activeIds.push(result.insertId);
      }
    }

    // Delete social links not present in activeIds list
    if (activeIds.length > 0) {
      const placeholders = activeIds.map(() => "?").join(",");
      await connection.execute(`DELETE FROM social_links WHERE id NOT IN (${placeholders})`, activeIds);
    } else {
      await connection.execute("DELETE FROM social_links");
    }
  });
}

// ==========================================
// 3. Certificates / Trust Logos Services
// ==========================================
async function getAllCertificates() {
  return await query("SELECT * FROM certificates ORDER BY sequence ASC, id DESC");
}

async function getCertificateById(id) {
  const results = await query("SELECT * FROM certificates WHERE id = ?", [id]);
  return results[0] || null;
}

async function createCertificate(data) {
  const { title, image_url, image_alt, link, status = "active" } = data;
  const sequence = await getNextSequence("certificates");

  let savedImage = image_url;
  if (image_url && image_url.startsWith("data:")) {
    savedImage = await uploadBase64File(image_url, "certificates");
  }

  const result = await query(
    `INSERT INTO certificates (title, image_url, image_alt, link, sequence, status) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [title, savedImage, image_alt, link, sequence, status]
  );
  return { id: result.insertId, title, image_url: savedImage, image_alt, link, sequence, status };
}

async function updateCertificate(id, data) {
  const certs = await query("SELECT id FROM certificates WHERE id = ?", [id]);
  if (certs.length === 0) throw new AppError("Certificate not found", 404);

  const { title, image_url, image_alt, link, sequence, status } = data;

  let savedImage = image_url;
  if (image_url && image_url.startsWith("data:")) {
    savedImage = await uploadBase64File(image_url, "certificates");
  }

  await query(
    `UPDATE certificates 
     SET title = ?, image_url = ?, image_alt = ?, link = ?, sequence = ?, status = ? 
     WHERE id = ?`,
    [title, savedImage, image_alt, link, sequence, status, id]
  );
  return { id, title, image_url: savedImage, image_alt, link, sequence, status };
}

async function deleteCertificate(id) {
  const certs = await query("SELECT * FROM certificates WHERE id = ?", [id]);
  if (certs.length === 0) throw new AppError("Certificate not found", 404);
  if (certs[0].image_url?.startsWith("/uploads/")) {
    try {
      deleteStoredFile(certs[0].image_url);
    } catch (error) {}
  }
  await query("DELETE FROM certificates WHERE id = ?", [id]);
}

// ==========================================
// 4. Common Inquiry Form Services
// ==========================================
function splitFullName(fullName) {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  return {
    first_name: parts[0] || "",
    last_name: parts.slice(1).join(" ") || "",
  };
}

function normalizeInquiry(row) {
  if (!row) return row;

  const fullName = [row.first_name, row.last_name].filter(Boolean).join(" ").trim();

  return {
    ...row,
    full_name: fullName,
    phone_number: row.mobile || "",
    inquiry_purpose: row.what_brings_you_here || "",
  };
}

function normalizeDateFilter(value, endOfDay = false) {
  if (!value) return value;
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value} ${endOfDay ? "23:59:59" : "00:00:00"}`
    : value;
}

async function getAllInquiries({
  search = "",
  purpose = "",
  page = 1,
  limit = 10,
  pageUrl = "",
  startDate = "",
  endDate = "",
}) {
  const currentPage = Math.max(parseInt(page, 10) || 1, 1);
  const perPage = Math.max(parseInt(limit, 10) || 10, 1);
  const offset = (currentPage - 1) * perPage;
  const whereClauses = [];
  const params = [];

  if (search) {
    whereClauses.push(
      "(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')) LIKE ? OR email LIKE ? OR mobile LIKE ? OR what_brings_you_here LIKE ?)"
    );
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (purpose) {
    whereClauses.push("what_brings_you_here = ?");
    params.push(purpose);
  }

  if (pageUrl) {
    whereClauses.push("page_url = ?");
    params.push(pageUrl);
  }

  if (startDate) {
    whereClauses.push("created_at >= ?");
    params.push(normalizeDateFilter(startDate));
  }

  if (endDate) {
    whereClauses.push("created_at <= ?");
    params.push(normalizeDateFilter(endDate, true));
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  const countResult = await query(`SELECT COUNT(*) as total FROM inquiries ${whereSql}`, params);
  const total = countResult[0]?.total || 0;

  const rows = await query(
    `SELECT * FROM inquiries ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`,
    [...params, perPage, offset]
  );

  return {
    inquiries: rows.map(normalizeInquiry),
    pagination: {
      total,
      current_page: currentPage,
      per_page: perPage,
      last_page: Math.ceil(total / perPage) || 1,
    },
  };
}

async function createInquiry(data) {
  const { full_name, phone_number, email, inquiry_purpose, message, page_url } = data;
  const { first_name, last_name } = splitFullName(full_name);

  const result = await query(
    `INSERT INTO inquiries
     (first_name, last_name, email, mobile, company, what_brings_you_here, message, page_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [first_name, last_name, email, phone_number, null, inquiry_purpose, message, page_url || null]
  );

  const created = normalizeInquiry({
    id: result.insertId,
    first_name,
    last_name,
    email,
    mobile: phone_number,
    company: null,
    what_brings_you_here: inquiry_purpose,
    message,
    page_url: page_url || null,
  });

  // Send email alert to admin
  try {
    const adminEmail = process.env.SMTP_ADMIN_EMAIL || "info@anjanadham.org";
    const mailText = `
      You received a new inquiry on Vishw Anjanadham website:

      Name: ${created.full_name}
      Email: ${email}
      Phone Number: ${phone_number || "N/A"}
      Inquiry Purpose: ${inquiry_purpose || "N/A"}
      Message: ${message || "N/A"}
      Page URL: ${page_url || "N/A"}
      Submitted At: ${new Date().toLocaleString()}
    `;

    await sendMail({
      to: adminEmail,
      subject: `New Contact Inquiry - ${created.full_name}`,
      text: mailText,
    });
  } catch (err) {
    console.error("Failed to send admin inquiry notification email:", err);
  }

  return created;
}

async function deleteInquiry(id) {
  const result = await query("SELECT id FROM inquiries WHERE id = ?", [id]);
  if (result.length === 0) throw new AppError("Inquiry record not found", 404);
  await query("DELETE FROM inquiries WHERE id = ?", [id]);
}
// ==========================================
// 5. FAQ Management Services
// ==========================================
async function getAllFaqs() {
  return await query(
    "SELECT id, page, question, answer, sequence, status, created_at, updated_at FROM faqs ORDER BY sequence ASC, id DESC"
  );
}

async function getFaqById(id) {
  const results = await query(
    "SELECT id, page, question, answer, sequence, status, created_at, updated_at FROM faqs WHERE id = ?",
    [id]
  );
  return results[0] || null;
}

async function createFaq(data) {
  const { page, question, answer, status = "active" } = data;
  const sequence = await getNextSequence("faqs", { page });
  const result = await query(
    `INSERT INTO faqs (page, question, answer, sequence, status)
     VALUES (?, ?, ?, ?, ?)`,
    [page, question, answer, sequence, status]
  );
  return { id: result.insertId, page, question, answer, sequence, status };
}

async function updateFaq(id, data) {
  const faqsCheck = await query("SELECT id FROM faqs WHERE id = ?", [id]);
  if (faqsCheck.length === 0) throw new AppError("FAQ not found", 404);

  const { page, question, answer, sequence, status } = data;
  await query(
    `UPDATE faqs
     SET page = ?, question = ?, answer = ?, sequence = ?, status = ?
     WHERE id = ?`,
    [page, question, answer, sequence, status, id]
  );
  return { id, page, question, answer, sequence, status };
}

async function deleteFaq(id) {
  const faqsCheck = await query("SELECT id FROM faqs WHERE id = ?", [id]);
  if (faqsCheck.length === 0) throw new AppError("FAQ not found", 404);
  await query("DELETE FROM faqs WHERE id = ?", [id]);
}

// ==========================================
// 6. Banner Management Services
// ==========================================
async function getAllBanners() {
  return await query("SELECT * FROM banners ORDER BY id DESC");
}

async function getBannerById(id) {
  const results = await query("SELECT * FROM banners WHERE id = ?", [id]);
  return results[0] || null;
}

async function updateBanner(id, data) {
  const bannerCheck = await query("SELECT id FROM banners WHERE id = ?", [id]);
  if (bannerCheck.length === 0) throw new AppError("Banner not found", 404);

  const { page, title, file_url, alt_text, status } = data;

  let savedFile = file_url;
  if (file_url && file_url.startsWith("data:")) {
    savedFile = await uploadBase64File(file_url, "banners");
  }

  await query(
    `UPDATE banners
     SET page = ?, title = ?, file_url = ?, alt_text = ?, status = ?
     WHERE id = ?`,
    [page, title, savedFile, alt_text, status, id]
  );
  return { id, page, title, file_url: savedFile, alt_text, status };
}

module.exports = {
  getAllSeoContent,
  getSeoByPage,
  getSeoById,
  createOrUpdateSeo,
  updateSeoById,
  deleteSeo,
  getFooterDetails,
  updateFooterDetails,
  getAllCertificates,
  getCertificateById,
  createCertificate,
  updateCertificate,
  deleteCertificate,
  getAllInquiries,
  createInquiry,
  deleteInquiry,
  getAllFaqs,
  getFaqById,
  createFaq,
  updateFaq,
  deleteFaq,
  getAllBanners,
  getBannerById,
  updateBanner,
};

