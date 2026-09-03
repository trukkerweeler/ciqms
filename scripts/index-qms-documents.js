// CLI: node scripts/index-qms-documents.js [directory]
// Walks a directory of QMS documents, extracts text via Tika, and stores it in the search index.
require("dotenv").config();
const path = require("path");
const { indexDirectory } = require("../services/docIndexer");

async function main() {
  const directory = process.argv[2] || process.env.QMS_DOCS_DIR;

  if (!directory) {
    console.error(
      "Usage: node scripts/index-qms-documents.js <directory>  (or set QMS_DOCS_DIR in .env)",
    );
    process.exit(1);
  }

  const absoluteDir = path.resolve(directory);
  console.log(`Indexing QMS documents from: ${absoluteDir}`);

  const results = await indexDirectory(absoluteDir);

  console.log("\n=== Indexing Summary ===");
  console.log(`Processed: ${results.processed}`);
  console.log(`Indexed:   ${results.indexed}`);
  console.log(`Skipped:   ${results.skipped.length}`);
  console.log(`Errors:    ${results.errors.length}`);

  if (results.skipped.length > 0) {
    console.log("\n--- Skipped files ---");
    results.skipped.forEach((s) => {
      const sizeMb = (s.size / (1024 * 1024)).toFixed(1);
      console.log(`  - [${s.reason}] ${s.filePath} (${sizeMb} MB)`);
    });
  }

  if (results.errors.length > 0) {
    console.log("\n--- Errors ---");
    results.errors.forEach((e) =>
      console.log(`  - ${e.filePath}: ${e.message}`),
    );
  }
}

main().catch((error) => {
  console.error("Indexing failed:", error);
  process.exit(1);
});
