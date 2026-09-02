// Express routes for triggering QMS document indexing and searching the index.
const express = require("express");
const path = require("path");
const router = express.Router();
const { indexDirectory } = require("../services/docIndexer");
const { search } = require("../services/searchIndex");

// POST /index-docs  { "directory": "C:\\path\\to\\qms\\docs" }
// Walks the given directory (or QMS_DOCS_DIR from .env if omitted), extracts text via Tika,
// and stores results in the search index.
router.post("/index-docs", async (req, res) => {
  const directory = req.body?.directory || process.env.QMS_DOCS_DIR;

  if (!directory) {
    return res.status(400).json({
      error:
        "Provide a 'directory' in the request body or set QMS_DOCS_DIR in .env",
    });
  }

  try {
    const results = await indexDirectory(path.resolve(directory));
    res.json(results);
  } catch (error) {
    console.error("[/index-docs] error:", error);
    // Tika-down errors are distinguishable so callers can retell "service unavailable" vs a real bug.
    const isTikaDown = error.message.includes("Tika server is not reachable");
    res.status(isTikaDown ? 503 : 500).json({ error: error.message });
  }
});

// GET /search?q=keyword&limit=20
router.get("/search", async (req, res) => {
  const query = req.query.q;
  const limit = Number(req.query.limit) || 20;

  if (!query) {
    return res.status(400).json({ error: "Query parameter 'q' is required" });
  }

  try {
    const results = await search(query, limit);
    res.json(results);
  } catch (error) {
    console.error("[/search] error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
