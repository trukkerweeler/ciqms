// Minimal wrapper around Meilisearch's HTTP API for storing/searching QMS document text.
// Meilisearch is an external service (started separately) — this module never starts/stops it.
// Swap MEILI_HOST for an OpenSearch endpoint + adjust request shapes if you prefer OpenSearch instead.
const {
  MEILI_HOST,
  MEILI_API_KEY,
  MEILI_INDEX,
} = require("../config/docSearchConfig");

function authHeaders(extra = {}) {
  const headers = { "Content-Type": "application/json", ...extra };
  if (MEILI_API_KEY) headers.Authorization = `Bearer ${MEILI_API_KEY}`;
  return headers;
}

/**
 * Check whether the configured Meilisearch instance is up and responding.
 * @returns {Promise<{up: boolean, status: number|null, error?: string}>}
 */
async function checkHealth() {
  try {
    const response = await fetch(`${MEILI_HOST}/health`, {
      method: "GET",
      headers: authHeaders(),
    });
    return { up: response.ok, status: response.status };
  } catch (error) {
    return { up: false, status: null, error: error.message };
  }
}

/**
 * Create the index if it doesn't already exist (no-op if it does).
 */
async function ensureIndex() {
  const response = await fetch(`${MEILI_HOST}/indexes`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ uid: MEILI_INDEX, primaryKey: "id" }),
  });

  // 409 = index already exists, which is fine.
  if (!response.ok && response.status !== 409) {
    const body = await response.text();
    throw new Error(
      `Failed to create index ${MEILI_INDEX}: ${response.status} ${body}`,
    );
  }
}

/**
 * Index (or update) one or more documents.
 * @param {Array<object>} documents each must include an `id` field
 */
async function indexDocuments(documents) {
  const response = await fetch(
    `${MEILI_HOST}/indexes/${MEILI_INDEX}/documents`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(documents),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to index documents: ${response.status} ${body}`);
  }

  return response.json();
}

/**
 * Search indexed documents by keyword.
 * @param {string} query
 * @param {number} limit
 */
async function search(query, limit = 20) {
  const response = await fetch(`${MEILI_HOST}/indexes/${MEILI_INDEX}/search`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ q: query, limit }),
  });

  if (!response.ok) {
    const body = await response.text();
    // Index doesn't exist yet (no documents indexed yet) — treat as "no results" not an error.
    if (response.status === 404) {
      return { hits: [], estimatedTotalHits: 0, query };
    }
    throw new Error(`Search failed: ${response.status} ${body}`);
  }

  return response.json();
}

module.exports = {
  ensureIndex,
  indexDocuments,
  search,
  checkHealth,
  MEILI_INDEX,
};
