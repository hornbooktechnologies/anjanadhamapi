const { query } = require("../../config/database");
const { sendMail } = require("../../utils/mailer");

let tableEnsured = false;

async function ensureContactEnquiriesTable() {
  if (tableEnsured) return;

  await query(`
    CREATE TABLE IF NOT EXISTS contact_enquiries (
      id INT AUTO_INCREMENT PRIMARY KEY,
      full_name VARCHAR(255) NOT NULL,
      phone_number VARCHAR(50) NOT NULL,
      email VARCHAR(100) NOT NULL,
      inquiry_purpose VARCHAR(150) NOT NULL,
      message TEXT NOT NULL,
      page_url VARCHAR(255) NULL,
      email_sent TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_contact_enquiries_email (email),
      INDEX idx_contact_enquiries_purpose (inquiry_purpose),
      INDEX idx_contact_enquiries_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  tableEnsured = true;
}

function normalizeDateFilter(value, endOfDay = false) {
  if (!value) return value;
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value} ${endOfDay ? "23:59:59" : "00:00:00"}`
    : value;
}

function buildUserEmail({ full_name, inquiry_purpose, message }) {
  const text = `Dear ${full_name},

Thank you for contacting Vishw Anjanadham. We have received your inquiry and our team will get back to you shortly.

Inquiry Purpose: ${inquiry_purpose}
Message: ${message}

Regards,
Vishw Anjanadham Team`;

  const html = `
    <p>Dear ${full_name},</p>
    <p>Thank you for contacting <strong>Vishw Anjanadham</strong>. We have received your inquiry and our team will get back to you shortly.</p>
    <p><strong>Inquiry Purpose:</strong> ${inquiry_purpose}</p>
    <p><strong>Message:</strong><br/>${String(message).replace(/\n/g, "<br/>")}</p>
    <p>Regards,<br/>Vishw Anjanadham Team</p>
  `;

  return { text, html };
}

async function createContactEnquiry(data) {
  await ensureContactEnquiriesTable();

  const payload = {
    full_name: data.full_name.trim(),
    phone_number: data.phone_number.trim(),
    email: data.email.trim().toLowerCase(),
    inquiry_purpose: data.inquiry_purpose.trim(),
    message: data.message.trim(),
    page_url: data.page_url ? data.page_url.trim() : null,
  };

  const result = await query(
    `INSERT INTO contact_enquiries
     (full_name, phone_number, email, inquiry_purpose, message, page_url, email_sent)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.full_name,
      payload.phone_number,
      payload.email,
      payload.inquiry_purpose,
      payload.message,
      payload.page_url,
      0,
    ]
  );

  let emailSent = false;
  try {
    const emailContent = buildUserEmail(payload);
    await sendMail({
      to: payload.email,
      subject: "We received your inquiry - Vishw Anjanadham",
      text: emailContent.text,
      html: emailContent.html,
    });
    emailSent = true;
    await query("UPDATE contact_enquiries SET email_sent = 1 WHERE id = ?", [result.insertId]);
  } catch (error) {
    console.error("Failed to send contact enquiry confirmation email:", error);
  }

  return {
    id: result.insertId,
    ...payload,
    email_sent: emailSent,
  };
}
async function getContactEnquiries({ search = "", purpose = "", startDate = "", endDate = "", page = 1, limit = 10 } = {}) {
  await ensureContactEnquiriesTable();

  const currentPage = Math.max(parseInt(page, 10) || 1, 1);
  const perPage = Math.max(parseInt(limit, 10) || 10, 1);
  const offset = (currentPage - 1) * perPage;
  const where = [];
  const params = [];

  if (search) {
    where.push("(full_name LIKE ? OR phone_number LIKE ? OR email LIKE ? OR inquiry_purpose LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (purpose) {
    where.push("inquiry_purpose = ?");
    params.push(purpose);
  }

  if (startDate) {
    where.push("created_at >= ?");
    params.push(normalizeDateFilter(startDate));
  }

  if (endDate) {
    where.push("created_at <= ?");
    params.push(normalizeDateFilter(endDate, true));
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const countRows = await query(`SELECT COUNT(*) AS total FROM contact_enquiries ${whereSql}`, params);
  const total = countRows[0]?.total || 0;

  const rows = await query(
    `SELECT id, full_name, phone_number, email, inquiry_purpose, message, page_url, email_sent, created_at
     FROM contact_enquiries
     ${whereSql}
     ORDER BY id DESC
     LIMIT ? OFFSET ?`,
    [...params, perPage, offset]
  );

  return {
    data: rows.map((row) => ({ ...row, email_sent: Boolean(row.email_sent) })),
    pagination: {
      total,
      current_page: currentPage,
      per_page: perPage,
      last_page: Math.ceil(total / perPage) || 1,
    },
  };
}

module.exports = {
  createContactEnquiry,
  getContactEnquiries,
};

