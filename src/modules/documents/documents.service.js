const { query } = require("../../config/database");
const AppError = require("../../utils/AppError");
const { saveUploadedBuffer, deleteStoredFile, uploadBase64File } = require("../../utils/fileUpload");

function detectFileType(mimeType = "", originalName = "") {
  const ext = originalName.split(".").pop().toLowerCase();
  const mime = mimeType.toLowerCase();

  if (mime.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp", "svg", "avif"].includes(ext)) {
    return "image";
  }
  if (mime.startsWith("video/") || ["mp4", "webm", "mov", "avi", "mkv"].includes(ext)) {
    return "video";
  }
  if (mime === "application/pdf" || ext === "pdf") {
    return "pdf";
  }
  if (
    mime.includes("word") ||
    mime.includes("excel") ||
    mime.includes("spreadsheet") ||
    mime.includes("presentation") ||
    mime.includes("powerpoint") ||
    mime.includes("text") ||
    ["doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv", "rtf", "odt", "ods"].includes(ext)
  ) {
    return "document";
  }
  return "other";
}

async function ensureDocumentsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS documents (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      title         VARCHAR(255) NOT NULL,
      file_url      TEXT NOT NULL,
      file_type     ENUM('image','video','pdf','document','other') DEFAULT 'other',
      file_size     BIGINT DEFAULT 0,
      original_name VARCHAR(500) NULL,
      mime_type     VARCHAR(100) NULL,
      uploaded_by   INT NULL,
      status        ENUM('active','inactive') DEFAULT 'active',
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

const fs = require("fs");
const path = require("path");
const { getAbsolutePathFromPublicUploadPath } = require("../../utils/uploadStorage");

async function fixMisclassifiedDocuments() {
  try {
    const rows = await query("SELECT id, title, file_url, file_type, original_name, mime_type FROM documents");
    for (const doc of rows) {
      let fileUrl = doc.file_url;
      const nameOrUrl = doc.original_name || fileUrl || "";
      const detectedType = detectFileType(doc.mime_type || "", nameOrUrl);

      if (fileUrl && fileUrl.endsWith(".bin") && doc.original_name && doc.original_name.includes(".")) {
        const correctExt = doc.original_name.split(".").pop().trim().toLowerCase();
        if (correctExt && correctExt !== "bin") {
          const oldAbsPath = getAbsolutePathFromPublicUploadPath(fileUrl);
          const newFileUrl = fileUrl.replace(/\.bin$/, `.${correctExt}`);
          const newAbsPath = getAbsolutePathFromPublicUploadPath(newFileUrl);

          try {
            if (fs.existsSync(oldAbsPath)) {
              fs.renameSync(oldAbsPath, newAbsPath);
              fileUrl = newFileUrl;
              await query("UPDATE documents SET file_url = ? WHERE id = ?", [newFileUrl, doc.id]);
            }
          } catch (err) {
            console.error("Failed to rename .bin file:", err);
          }
        }
      }

      if (doc.file_type !== detectedType) {
        await query("UPDATE documents SET file_type = ? WHERE id = ?", [detectedType, doc.id]);
      }
    }
  } catch (e) {
    // Ignore error
  }
}

async function getAllDocuments({ search = "", file_type = "", status = "", page, limit } = {}) {
  await ensureDocumentsTable();
  await fixMisclassifiedDocuments();
  const where = [];
  const params = [];

  if (search && search.trim()) {
    where.push("(title LIKE ? OR original_name LIKE ?)");
    params.push(`%${search.trim()}%`, `%${search.trim()}%`);
  }
  if (file_type && file_type.trim() && file_type !== "all") {
    where.push("file_type = ?");
    params.push(file_type.trim());
  }
  if (status && status.trim() && status !== "all") {
    where.push("status = ?");
    params.push(status.trim());
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  if (page !== undefined && limit !== undefined) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const offset = (pageNum - 1) * limitNum;

    const countRes = await query(`SELECT COUNT(*) as total FROM documents ${whereSql}`, params);
    const total = countRes[0]?.total || 0;

    const rows = await query(
      `SELECT * FROM documents ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    return {
      data: rows,
      pagination: {
        total,
        per_page: limitNum,
        current_page: pageNum,
        last_page: Math.ceil(total / limitNum) || 1,
      },
    };
  }

  const rows = await query(`SELECT * FROM documents ${whereSql} ORDER BY id DESC`, params);
  return { data: rows };
}

async function getDocumentById(id) {
  await ensureDocumentsTable();
  const rows = await query("SELECT * FROM documents WHERE id = ?", [id]);
  if (!rows.length) throw new AppError("Document not found", 404);
  return rows[0];
}

async function createDocument(file, bodyData = {}, userId = null) {
  await ensureDocumentsTable();

  let fileUrl = "";
  let originalName = bodyData.title || "Untitled Document";
  let mimeType = "";
  let fileSize = 0;

  if (file) {
    fileUrl = await saveUploadedBuffer(file, "documents");
    originalName = file.originalname || originalName;
    mimeType = file.mimetype || "";
    fileSize = file.size || 0;
  } else if (bodyData.file_url && bodyData.file_url.startsWith("data:")) {
    fileUrl = await uploadBase64File(bodyData.file_url, "documents");
    originalName = bodyData.original_name || originalName;
    mimeType = bodyData.mime_type || "";
  } else if (bodyData.file_url) {
    fileUrl = bodyData.file_url;
  } else {
    throw new AppError("Please select a file to upload.", 400);
  }

  const title = (bodyData.title && bodyData.title.trim()) || originalName;
  const fileType = detectFileType(mimeType, originalName);
  const status = bodyData.status || "active";

  const result = await query(
    `INSERT INTO documents (title, file_url, file_type, file_size, original_name, mime_type, uploaded_by, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [title, fileUrl, fileType, fileSize, originalName, mimeType, userId, status]
  );

  return getDocumentById(result.insertId);
}

async function updateDocument(id, data) {
  await ensureDocumentsTable();
  const prev = await getDocumentById(id);

  const title = data.title !== undefined ? data.title.trim() : prev.title;
  const status = data.status !== undefined ? data.status : prev.status;

  await query(
    `UPDATE documents SET title = ?, status = ? WHERE id = ?`,
    [title, status, id]
  );

  return getDocumentById(id);
}

async function deleteDocument(id) {
  await ensureDocumentsTable();
  const doc = await getDocumentById(id);

  if (doc.file_url && doc.file_url.startsWith("/uploads/")) {
    try {
      deleteStoredFile(doc.file_url);
    } catch (e) {
      console.error("Failed to delete stored file:", e);
    }
  }

  await query("DELETE FROM documents WHERE id = ?", [id]);
  return { id: Number(id), deleted: true };
}

module.exports = {
  detectFileType,
  getAllDocuments,
  getDocumentById,
  createDocument,
  updateDocument,
  deleteDocument,
};
