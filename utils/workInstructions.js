// Utility to scan input-files directory and return a mapping of code to file URL
const fs = require("fs");
const path = require("path");

const inputFilesPath =
  process.env.INPUT_FILES_PATH ||
  String.raw`\\fs1\Common\Quality\00000_Work Instructions`;

function getWorkInstructionLinks() {
  let result = {};
  try {
    // Only scan files if local path, otherwise skip (network path not supported here)
    const files = fs.readdirSync(inputFilesPath);
    files.forEach((file) => {
      // Match code in parentheses, e.g. "SomeFile (SUPE1).pdf"
      const match = file.match(/\(([^)]+)\)/);
      if (match) {
        const code = match[1].toUpperCase();
        result[code] = `/input-files/${encodeURIComponent(file)}`;
      }
    });
  } catch (err) {
    // If error (network path), return empty
    return {};
  }
  return result;
}

module.exports = { getWorkInstructionLinks };
