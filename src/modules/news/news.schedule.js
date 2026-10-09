const { query } = require("../../config/database");

let schemaReady;
function ensureAnnouncementSchedule() {
  if (!schemaReady) schemaReady = (async () => {
    const columns = await query("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'news_content' AND COLUMN_NAME = 'publish_at'");
    if (!columns.length) {
      try { await query("ALTER TABLE news_content ADD COLUMN publish_at DATETIME NULL AFTER date"); }
      catch (error) { if (error.code !== "ER_DUP_FIELDNAME") throw error; }
    }
  })().catch(error => { schemaReady = undefined; throw error; });
  return schemaReady;
}

function calendarDate(value) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}
function istScheduleToUtc(date, time = "00:00") {
  const value = new Date(`${calendarDate(date)}T${time}:00+05:30`);
  if (Number.isNaN(value.getTime())) throw new Error("Invalid IST publish date or time");
  return value.toISOString().slice(0, 19).replace("T", " ");
}
function utcNowSql() { return new Date().toISOString().slice(0, 19).replace("T", " "); }

function resolvePublicationSchedule(data, existing = null) {
  const hasDate = data.date !== undefined && data.date !== null && data.date !== "";
  const hasTime = data.publish_time !== undefined && data.publish_time !== null && data.publish_time !== "";
  const preserve = () => ({ date: existing.date, publish_at: existing.publish_at
    ? existing.publish_at.slice(0, 19).replace("T", " ")
    : istScheduleToUtc(existing.date, existing.publish_time || "00:00") });
  if (existing && data.date === undefined && data.publish_time === undefined && data.publish_immediately === undefined) return preserve();
  if (existing && data.publish_status === "draft" && !hasDate && !hasTime) return preserve();
  if (data.publish_immediately || (!hasDate && !hasTime)) {
    // Editing an already public notice retains its original publication timestamp.
    if (existing?.publish_status === "published" && existing.publication_state === "published") return preserve();
    const now = new Date();
    return { date: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now), publish_at: now.toISOString().slice(0, 19).replace("T", " ") };
  }
  const date = hasDate ? calendarDate(data.date)
    : data.date === undefined && existing ? existing.date
    : new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  const time = hasTime ? data.publish_time : data.publish_time === undefined && existing ? existing.publish_time || "00:00" : "00:00";
  return { date, publish_at: istScheduleToUtc(date, time) };
}

// Legacy notices start at midnight IST; publish_at is always stored as UTC.
const scheduleSql = "COALESCE(n.publish_at, TIMESTAMP(n.date) - INTERVAL 330 MINUTE)";
const scheduleFields = `DATE_FORMAT(${scheduleSql}, '%Y-%m-%dT%H:%i:%sZ') AS publish_at, DATE_FORMAT(${scheduleSql} + INTERVAL 330 MINUTE, '%H:%i') AS publish_time`;
module.exports = { ensureAnnouncementSchedule, calendarDate, istScheduleToUtc, utcNowSql, resolvePublicationSchedule, scheduleSql, scheduleFields };
