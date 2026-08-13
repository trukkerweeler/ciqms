const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();

const filePath = path.join(__dirname, "..", "data", "filing-locations.json");

function normalizeFilingLocationPath(location = "") {
  const trimmedLocation = String(location || "").trim();
  if (!trimmedLocation) {
    return "";
  }

  const normalizedLocation = trimmedLocation.replace(/\//g, "\\");

  if (normalizedLocation.startsWith("\\\\fs1\\Quality - Records")) {
    return normalizedLocation.replace(
      "\\\\fs1\\Quality - Records",
      "\\\\fs1\\Common\\Quality - Records",
    );
  }

  if (/^K:\\Quality - Records/i.test(normalizedLocation)) {
    return normalizedLocation.replace(
      /^K:\\Quality - Records/i,
      "\\\\fs1\\Common\\Quality - Records",
    );
  }

  return normalizedLocation;
}

function readLocations() {
  if (!fs.existsSync(filePath)) {
    return {};
  }
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return Object.fromEntries(
    Object.entries(parsed || {}).map(([code, location]) => [
      code,
      normalizeFilingLocationPath(location),
    ]),
  );
}

function writeLocations(data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

router.get("/", (req, res) => {
  res.json(readLocations());
});

router.post("/", (req, res) => {
  try {
    const { code, location, key } = req.body || {};
    if (!code || !location) {
      res.status(400).json({ error: "Code and location are required." });
      return;
    }

    const data = readLocations();
    if (key && key !== code && data[key]) {
      delete data[key];
    }
    data[code] = normalizeFilingLocationPath(location);
    writeLocations(data);
    res.json({ success: true, message: "Filing location saved." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/", (req, res) => {
  try {
    const { key } = req.body || {};
    if (!key) {
      res.status(400).json({ error: "A key is required." });
      return;
    }

    const data = readLocations();
    if (!Object.prototype.hasOwnProperty.call(data, key)) {
      res.status(404).json({ error: "Filing location not found." });
      return;
    }

    delete data[key];
    writeLocations(data);
    res.json({ success: true, message: "Filing location deleted." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
