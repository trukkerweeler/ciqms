// Sends a file to a running Apache Tika server and returns extracted text + metadata.
// Tika is an external service (started separately, e.g. `docker run -p 9998:9998 apache/tika`).
// This module never starts/stops Tika — it only calls it and reports whether it's reachable.
const fs = require("fs/promises");
const path = require("path");
const { TIKA_SERVER_URL } = require("../config/docSearchConfig");

/**
 * Check whether the configured Tika server is up and responding.
 * @returns {Promise<{up: boolean, status: number|null, error?: string}>}
 */
async function checkHealth() {
  try {
    const response = await fetch(`${TIKA_SERVER_URL}/tika`, {
      method: "GET",
    });
    return { up: response.ok, status: response.status };
  } catch (error) {
    return { up: false, status: null, error: error.message };
  }
}

/**
 * Extract plain text from a file using Tika's /tika endpoint.
 * @param {string} filePath absolute path to the file on disk
 * @returns {Promise<string>} extracted text
 */
async function extractText(filePath) {
  const buffer = await fs.readFile(filePath);

  const response = await fetch(`${TIKA_SERVER_URL}/tika`, {
    method: "PUT",
    headers: {
      Accept: "text/plain",
      "Content-Type": "application/octet-stream",
    },
    body: buffer,
  });

  if (!response.ok) {
    throw new Error(
      `Tika extraction failed for ${filePath}: ${response.status} ${response.statusText}`,
    );
  }

  return response.text();
}

/**
 * Extract document metadata (author, content-type, created date, etc.) using Tika's /meta endpoint.
 * @param {string} filePath absolute path to the file on disk
 * @returns {Promise<object>} metadata key/value pairs
 */
async function extractMetadata(filePath) {
  const buffer = await fs.readFile(filePath);

  const response = await fetch(`${TIKA_SERVER_URL}/meta`, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/octet-stream",
    },
    body: buffer,
  });

  if (!response.ok) {
    throw new Error(
      `Tika metadata extraction failed for ${filePath}: ${response.status} ${response.statusText}`,
    );
  }

  return response.json();
}

/**
 * Convenience helper: extract both text and metadata for a file.
 */
async function extractTextAndMetadata(filePath) {
  const [text, metadata] = await Promise.all([
    extractText(filePath),
    extractMetadata(filePath),
  ]);

  return {
    fileName: path.basename(filePath),
    filePath,
    text: text.trim(),
    metadata,
  };
}

module.exports = {
  extractText,
  extractMetadata,
  extractTextAndMetadata,
  checkHealth,
};
