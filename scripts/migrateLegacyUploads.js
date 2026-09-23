const fs = require("fs");
const path = require("path");
const {
  copyMissingFiles,
  getLegacyUploadRootDir,
  getUploadRootDir,
} = require("../src/utils/uploadStorage");

function main() {
  const legacyDir = getLegacyUploadRootDir();
  const targetDir = getUploadRootDir();

  if (!fs.existsSync(legacyDir)) {
    console.log(`[uploads] Legacy upload folder not found: ${legacyDir}`);
    return;
  }

  const copiedFiles = copyMissingFiles(legacyDir, targetDir);

  console.log(`[uploads] Legacy folder: ${legacyDir}`);
  console.log(`[uploads] Target folder: ${targetDir}`);
  console.log(`[uploads] Copied ${copiedFiles} file(s)`);
}

main();
