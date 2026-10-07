/* Import only the ten real headshots extracted from client slide _034.jpg.
 * Preview: node scripts/importTrusteePortraits.js
 * Apply:   node scripts/importTrusteePortraits.js --apply
 * PNGs are copied losslessly. Existing portraits and translations are kept.
 */
const fs = require("node:fs");
const path = require("node:path");
const { query, pool } = require("../src/config/database");
const { updateKeyMember } = require("../src/modules/key-members/key-members.service");
const { getUploadTargetDir } = require("../src/utils/uploadStorage");
const root = path.resolve(__dirname, "../..");
const review = path.join(root, "anjanadhamapi/.agent/trustee-portraits");
const manifest = JSON.parse(fs.readFileSync(path.join(review, "portrait-manifest.json"), "utf8"));
const projectFile = path.join(root, "anjanadham/src/data/client-project-content.json");

async function main() {
  const project = JSON.parse(fs.readFileSync(projectFile, "utf8"));
  const members = await query("SELECT * FROM key_members WHERE status = ?", ["active"]);
  for (const portrait of manifest.portraits) {
    if (!project.team.some(member => member.name === portrait.name)) throw Error(`Missing fallback member: ${portrait.name}`);
    if (!members.some(member => member.name === portrait.name)) throw Error(`Missing admin member: ${portrait.name}`);
    if (!fs.existsSync(path.join(root, "anjanadham/public", portrait.photo))) throw Error(`Missing portrait: ${portrait.name}`);
  }
  console.log(`Matched ${manifest.portraits.length} source-labelled portraits to existing trustee records.`);
  if (!process.argv.includes("--apply")) return;
  const backup = path.join(review, `before-import-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  fs.writeFileSync(backup, JSON.stringify({ members, project }, null, 2));
  const dir = getUploadTargetDir("key-members/trustees");
  for (const portrait of manifest.portraits) {
    const row = members.find(member => member.name === portrait.name);
    const file = `${portrait.slug}.png`;
    fs.copyFileSync(path.join(root, "anjanadham/public", portrait.photo), path.join(dir, file));
    await updateKeyMember(row.id, { ...row, photo_url: `/uploads/key-members/trustees/${file}`, photo_alt: portrait.name });
    project.team.find(member => member.name === portrait.name).photo = portrait.photo;
  }
  fs.writeFileSync(projectFile, JSON.stringify(project, null, 2) + "\n");
  console.log(`Updated 10 admin photos and frontend fallbacks. Backup: ${backup}`);
}
main().catch(error => { console.error(error.message); process.exitCode=1; }).finally(() => pool.end());
