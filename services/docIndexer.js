// Walks a directory of QMS documents, extracts text via Tika, and stores it in the search index.
const fs = require("fs/promises");
const { constants: fsConstants } = require("fs");
const path = require("path");
const crypto = require("crypto");
const {
  extractTextAndMetadata,
  checkHealth: checkTikaHealth,
} = require("./tika");
const {
  ensureIndex,
  indexDocuments,
  listAllDocumentIds,
  deleteDocuments,
} = require("./searchIndex");

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

// Only top-level QMS section folders named like "04420 - Quality Manual" are indexed.
const SECTION_FOLDER_PATTERN = /^\d{5} - /;

// Section folders that should be indexed non-recursively: files directly inside are indexed,
// but their subfolders are skipped entirely.
const NON_RECURSIVE_FOLDERS = new Set(["07130 - Infrastructure"]);

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
 * List immediate subdirectories of `rootDir` whose name matches SECTION_FOLDER_PATTERN.
 * Everything else directly under `rootDir` is ignored.
 */
async function listSectionDirs(rootDir) {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  return entries
    .filter(
      (entry) => entry.isDirectory() && SECTION_FOLDER_PATTERN.test(entry.name),
    )
    .map((entry) => path.join(rootDir, entry.name));
}

/**
 * Recursively list files under a directory that match SUPPORTED_EXTENSIONS.
 * Oversized files are skipped but reported via `skipped` so they aren't silently dropped.
 * @param {boolean} recursive when false, subfolders are ignored (top-level files only).
 */
async function walkDirectory(dir, skipped = [], recursive = true) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (recursive) {
        files.push(...(await walkDirectory(fullPath, skipped)));
      }
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
 * Pull QMS-specific fields (form number, revision, controlled/uncontrolled, etc.) out of a
 * document's extracted text using simple pattern matching — no AI, just regex heuristics.
 */
function extractQmsMetadata(text) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const title = lines[0] || null;

  const formNumber = (text.match(
    /(QP|WI|F|FM|FR|OP|PR)[-\s]?\d{2,4}[-\s]?\d{2,4}/i,
  ) || [null])[0];

  const revision = (text.match(/Rev(?:ision)?\s*([A-Z]|\d+(\.\d+)?)/i) || [
    null,
  ])[0];

  const controlled = /CONTROLLED COPY/i.test(text);
  const uncontrolled = /UNCONTROLLED COPY/i.test(text);

  const effectiveDate = (text.match(
    /Effective\s*Date[:\s]*([A-Za-z0-9\/-]+)/i,
  ) || [null, null])[1];

  const clauseRefs = [
    ...text.matchAll(/AS9100\s*(?:Rev\s*[A-D])?\s*(\d+\.\d+(\.\d+)?)/gi),
  ].map((m) => m[1]);

  const department =
    ["Quality", "Engineering", "Production", "Purchasing", "Maintenance"].find(
      (dep) => text.includes(dep),
    ) || null;

  let docType = null;
  if (formNumber && /^QP/i.test(formNumber)) docType = "Procedure";
  else if (formNumber && /^WI/i.test(formNumber)) docType = "Work Instruction";
  else if (formNumber && /^F/i.test(formNumber)) docType = "Form";

  return {
    title,
    formNumber,
    revision,
    controlled,
    uncontrolled,
    effectiveDate,
    clauseRefs,
    department,
    docType,
  };
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
  const sectionDirs = await listSectionDirs(directory);
  const files = [];
  for (const sectionDir of sectionDirs) {
    const recursive = !NON_RECURSIVE_FOLDERS.has(path.basename(sectionDir));
    files.push(...(await walkDirectory(sectionDir, skipped, recursive)));
  }
  const results = { processed: 0, indexed: 0, skipped, errors: [] };
  const currentIds = new Set();
  let batch = [];

  for (const filePath of files) {
    try {
      const {
        fileName,
        text,
        metadata: tikaMetadata,
      } = await extractTextAndMetadata(filePath);

      const metadata = {
        filePath,
        contentType: tikaMetadata["Content-Type"] || null,
        indexedAt: new Date().toISOString(),
        ...extractQmsMetadata(text),
      };

      const id = crypto.createHash("sha1").update(filePath).digest("hex");
      currentIds.add(id);

      batch.push({
        id,
        filename: fileName,
        text,
        ...metadata,
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

  // Prune stale documents: anything already in the index that wasn't part of this run
  // (e.g. a file that's since been excluded by the folder filter, moved, or deleted).
  const existingIds = await listAllDocumentIds();
  const staleIds = existingIds.filter((id) => !currentIds.has(id));
  await deleteDocuments(staleIds);
  results.removedStale = staleIds.length;

  return results;
}

module.exports = {
  walkDirectory,
  indexDirectory,
  listSectionDirs,
  extractQmsMetadata,
  SUPPORTED_EXTENSIONS,
  SECTION_FOLDER_PATTERN,
};
