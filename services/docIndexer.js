// Walks a directory of QMS documents, extracts text via Tika, and stores it in the search index.
const fs = require("fs/promises");
const { constants: fsConstants } = require("fs");
const path = require("path");
const crypto = require("crypto");
const {
  extractTextAndMetadata,
  checkHealth: checkTikaHealth,
} = require("./tika");
const { ensureIndex, indexDocuments } = require("./searchIndex");

const SUPPORTED_EXTENSIONS = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".txt",
  ".rtf",
]);

// Files to always ignore: Office lock files and OS metadata, never real QMS content.
const IGNORED_FILENAMES = new Set(["thumbs.db", "desktop.ini"]);
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // skip anything over 50MB to avoid stalling Tika

function isIndexable(entryName) {
  const lower = entryName.toLowerCase();
  if (lower.startsWith("~$")) return false; // Office lock file
  if (IGNORED_FILENAMES.has(lower)) return false;
  return SUPPORTED_EXTENSIONS.has(path.extname(lower));
}

/**
 * Confirm `dir` exists and is readable before doing any work (e.g. a network share that's
 * unreachable or a path the running account has no permission on).
 */
async function assertDirectoryReadable(dir) {
  try {
    await fs.access(dir, fsConstants.R_OK);
  } catch (error) {
    throw new Error(
      `QMS docs directory is not accessible: ${dir} (${error.code || error.message})`,
    );
  }
}

/**
 * Recursively list files under a directory that match SUPPORTED_EXTENSIONS.
 * Oversized files are skipped but reported via `skipped` so they aren't silently dropped.
 */
async function walkDirectory(dir, skipped = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await walkDirectory(fullPath, skipped)));
    } else if (isIndexable(entry.name)) {
      const stats = await fs.stat(fullPath);
      if (stats.size <= MAX_FILE_SIZE_BYTES) {
        files.push(fullPath);
      } else {
        skipped.push({
          filePath: fullPath,
          reason: "file-too-large",
          size: stats.size,
        });
      }
    }
  }

  return files;
}

/**
 * Extract text/metadata from every supported file under `directory` and index it.
 * @param {string} directory absolute path to walk
 * @param {number} batchSize how many files to send to the index per request
 */
async function indexDirectory(directory, batchSize = 25) {
  // Tika is an external service — verify it's reachable before doing any work.
  // We never attempt to start it; if it's down, fail fast with a clear message.
  const tikaHealth = await checkTikaHealth();
  if (!tikaHealth.up) {
    const message = `Tika server is not reachable, aborting index run. ${
      tikaHealth.error || `HTTP ${tikaHealth.status}`
    }`;
    console.error(`[docIndexer] ${message}`);
    throw new Error(message);
  }

  await assertDirectoryReadable(directory);
  await ensureIndex();

  const skipped = [];
  const files = await walkDirectory(directory, skipped);
  const results = { processed: 0, indexed: 0, skipped, errors: [] };
  let batch = [];

  for (const filePath of files) {
    try {
      const { fileName, text, metadata } =
        await extractTextAndMetadata(filePath);

      batch.push({
        id: crypto.createHash("sha1").update(filePath).digest("hex"),
        fileName,
        filePath,
        text,
        contentType: metadata["Content-Type"] || null,
        indexedAt: new Date().toISOString(),
      });

      results.processed += 1;
    } catch (error) {
      results.errors.push({ filePath, message: error.message });
    }

    if (batch.length >= batchSize) {
      await indexDocuments(batch);
      results.indexed += batch.length;
      batch = [];
    }
  }

  if (batch.length > 0) {
    await indexDocuments(batch);
    results.indexed += batch.length;
  }

  return results;
}

module.exports = { walkDirectory, indexDirectory, SUPPORTED_EXTENSIONS };
