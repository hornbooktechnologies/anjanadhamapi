const { query } = require('../../config/database');
const AppError = require('../../utils/AppError');
const { isStoredFileReferenced, deleteStoredFile } = require('../../utils/fileUpload');
const { overlayEntityTranslations, saveEntityTranslations, deleteEntityTranslations } = require('../translations/translations.service');
const fields = ['name', 'location', 'initiative', 'photo_alt'];
let schemaPromise;
function ensureDonorsTable() {
  if (!schemaPromise) schemaPromise = query(`CREATE TABLE IF NOT EXISTS donors (
    id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NULL, amount DECIMAL(14,2) NOT NULL,
    initiative VARCHAR(255) NULL, contribution_date DATE NOT NULL,
    photo_url TEXT NULL, photo_alt VARCHAR(255) NULL,
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_donors_status_amount (status, amount)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`).catch(error => { schemaPromise = null; throw error; });
  return schemaPromise;
}
const normalize = row => ({ ...row, amount: Number(row.amount),
  contribution_date: row.contribution_date instanceof Date
    ? `${row.contribution_date.getFullYear()}-${String(row.contribution_date.getMonth()+1).padStart(2,'0')}-${String(row.contribution_date.getDate()).padStart(2,'0')}`
    : String(row.contribution_date).slice(0,10),
});
async function getDonors({ status = '', search = '', lang = 'en' } = {}) {
  await ensureDonorsTable();
  const clauses = [], values = [];
  if (['active', 'inactive'].includes(status)) { clauses.push('status = ?'); values.push(status); }
  if (search.trim()) { clauses.push('(name LIKE ? OR location LIKE ?)'); values.push(`%${search.trim()}%`, `%${search.trim()}%`); }
  const rows = await query(`SELECT donors.*, DATE_FORMAT(contribution_date, '%Y-%m-%d') AS contribution_date FROM donors ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''} ORDER BY amount DESC, contribution_date DESC, id DESC`, values);
  return overlayEntityTranslations('donors', rows.map(normalize), lang, fields);
}
async function getDonor(id, lang = 'en') {
  await ensureDonorsTable();
  const rows = await query("SELECT donors.*, DATE_FORMAT(contribution_date, '%Y-%m-%d') AS contribution_date FROM donors WHERE id = ?", [id]);
  if (!rows.length) throw new AppError('Donor not found', 404);
  return overlayEntityTranslations('donors', normalize(rows[0]), lang, fields);
}
async function saveDonor(id, data) {
  await ensureDonorsTable();
  const previous = id ? await getDonor(id) : null;
  const values = [data.name, data.location || null, data.amount, data.initiative || null,
    data.contribution_date, data.photo_url || null, data.photo_alt || data.name, data.status];
  if (id) await query('UPDATE donors SET name=?, location=?, amount=?, initiative=?, contribution_date=?, photo_url=?, photo_alt=?, status=? WHERE id=?', [...values, id]);
  else {
    const result = await query('INSERT INTO donors (name,location,amount,initiative,contribution_date,photo_url,photo_alt,status) VALUES (?,?,?,?,?,?,?,?)', values);
    id = result.insertId;
  }
  if (data.translations) await saveEntityTranslations('donors', id, data.translations);
  if (previous?.photo_url && previous.photo_url !== data.photo_url) await cleanupPhoto(previous.photo_url);
  return getDonor(id);
}
async function cleanupPhoto(url) {
  if (url?.startsWith('/uploads/') && !await isStoredFileReferenced(url)) deleteStoredFile(url);
}
async function removeDonor(id) {
  const donor = await getDonor(id);
  await query('DELETE FROM donors WHERE id = ?', [id]);
  await deleteEntityTranslations('donors', id);
  await cleanupPhoto(donor.photo_url);
}
module.exports = { ensureDonorsTable, getDonors, getDonor, saveDonor, removeDonor };
