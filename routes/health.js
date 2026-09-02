// Health checks for external services the doc-indexing pipeline depends on.
// These only ever *read* status — nothing here starts, stops, or restarts a service.
const express = require("express");
const router = express.Router();
const { checkHealth: checkTikaHealth } = require("../services/tika");
const { checkHealth: checkMeiliHealth } = require("../services/searchIndex");
const config = require("../config/docSearchConfig");

// GET /health/tika
router.get("/tika", async (req, res) => {
  const result = await checkTikaHealth();
  res.status(result.up ? 200 : 503).json({
    service: "tika",
    env: config.env,
    url: config.TIKA_SERVER_URL,
    ...result,
  });
});

// GET /health/meilisearch
router.get("/meilisearch", async (req, res) => {
  const result = await checkMeiliHealth();
  res.status(result.up ? 200 : 503).json({
    service: "meilisearch",
    env: config.env,
    url: config.MEILI_HOST,
    ...result,
  });
});

module.exports = router;
