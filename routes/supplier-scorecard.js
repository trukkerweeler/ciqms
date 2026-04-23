const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();
const { spawn } = require("child_process");

// ==================================================
// Get top 10 suppliers with weighted scoring
router.get("/top-suppliers", (req, res) => {
  const debug = process.env.DEBUG_SUPPLIER_SCORECARD === "1";
  if (debug) console.debug("[supplier-scorecard] /top-suppliers route called");

  const vbsFilePath = path.join(__dirname, "supplier-scorecard-top10.vbs");
  const cscriptPath = path.join(
    process.env.SYSTEMROOT,
    "SysWOW64",
    "cscript.exe",
  );

  console.log("[supplier-scorecard] VBS path:", vbsFilePath);
  console.log("[supplier-scorecard] cscript path:", cscriptPath);
  console.log("[supplier-scorecard] Spawning VBScript...");

  const child = spawn(cscriptPath, ["//Nologo", vbsFilePath]);

  let output = "";
  let errorOutput = "";
  const startTime = Date.now();

  child.stdout.on("data", (data) => {
    output += data.toString();
    if (debug) console.debug("[supplier-scorecard] stdout chunk:", data.length);
  });

  child.stderr.on("data", (data) => {
    errorOutput += data.toString();
    if (debug) console.debug("[supplier-scorecard] stderr chunk:", data.length);
  });

  child.on("close", (code) => {
    const elapsed = Date.now() - startTime;
    console.log(
      `[supplier-scorecard] VBScript closed after ${elapsed}ms with code ${code}`,
    );

    if (code !== 0 || errorOutput) {
      console.error(
        `[supplier-scorecard] VBScript failed (code=${code}): ${errorOutput.trim()}`,
      );
      return res.status(500).json({
        error: `VBScript error (code ${code}): ${errorOutput.trim()}`,
      });
    }

    try {
      console.log(
        `[supplier-scorecard] Raw output length: ${output.length} bytes`,
      );
      const sanitized = output.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
      console.log(
        `[supplier-scorecard] Sanitized length: ${sanitized.length} bytes`,
      );

      const data = JSON.parse(sanitized);

      // Calculate weighted scores
      if (data && data.length > 0) {
        // Find max values for normalization
        const maxSpend = Math.max(
          ...data.map((d) => parseFloat(d.TOTAL_SPEND) || 0),
        );
        const maxLineCount = Math.max(
          ...data.map((d) => parseFloat(d.LINE_COUNT) || 0),
        );
        const maxPoCount = Math.max(
          ...data.map((d) => parseFloat(d.PO_COUNT) || 0),
        );

        // Calculate weighted scores for each supplier
        data.forEach((supplier) => {
          const spend = parseFloat(supplier.TOTAL_SPEND) || 0;
          const lineCount = parseFloat(supplier.LINE_COUNT) || 0;
          const poCount = parseFloat(supplier.PO_COUNT) || 0;
          const onTimePercent = parseFloat(supplier.ON_TIME_PERCENT) || 0;

          const spendScore = (maxSpend > 0 ? spend / maxSpend : 0) * 0.7;
          const lineScore =
            (maxLineCount > 0 ? lineCount / maxLineCount : 0) * 0.1;
          const poScore = (maxPoCount > 0 ? poCount / maxPoCount : 0) * 0.05;
          const onTimeScore = (onTimePercent / 100) * 0.15;

          supplier.WEIGHTED_SCORE =
            spendScore + lineScore + poScore + onTimeScore;
        });

        // Sort by weighted score and take top 10
        data.sort((a, b) => (b.WEIGHTED_SCORE || 0) - (a.WEIGHTED_SCORE || 0));
        const topTen = data.slice(0, 10);

        console.log(
          "[supplier-scorecard] Returning top 10 of",
          data.length,
          "suppliers",
        );
        if (debug)
          console.debug("[supplier-scorecard] Weighted scores calculated");
        res.json(topTen);
      } else {
        res.json(data);
      }
    } catch (err) {
      console.error("[supplier-scorecard] JSON parse error:", err.message);
      console.error(
        "[supplier-scorecard] Output sample:",
        output.substring(0, 500),
      );
      res.status(500).json({ error: `JSON parse error: ${err.message}` });
    }
  });

  child.on("error", (err) => {
    console.error("[supplier-scorecard] Failed to spawn VBScript:", err);
    res.status(500).json({ error: `Failed to spawn VBScript: ${err.message}` });
  });
});

// ==================================================
// Get supplier quarterly trend data
router.get("/trend", (req, res) => {
  const vendor = decodeURIComponent(req.query.vendor || "").trim();
  if (!vendor) {
    return res.status(400).json({ error: "Vendor code required" });
  }

  const debug = process.env.DEBUG_SUPPLIER_SCORECARD === "1";
  if (debug)
    console.debug(
      "[supplier-scorecard] /trend route called for vendor:",
      vendor,
    );

  const vbsFilePath = path.join(__dirname, "supplier-scorecard-trend.vbs");
  const cscriptPath = path.join(
    process.env.SYSTEMROOT,
    "SysWOW64",
    "cscript.exe",
  );

  console.log(`[supplier-scorecard] Fetching trend for vendor: '${vendor}'`);
  const startTime = Date.now();
  const child = spawn(cscriptPath, ["//Nologo", vbsFilePath, vendor]);

  let output = "";
  let errorOutput = "";

  child.stdout.on("data", (data) => {
    output += data.toString();
    if (debug) console.debug("[supplier-scorecard] stdout chunk:", data.length);
  });

  child.stderr.on("data", (data) => {
    errorOutput += data.toString();
    if (debug) console.debug("[supplier-scorecard] stderr chunk:", data.length);
  });

  child.on("close", (code) => {
    const elapsed = Date.now() - startTime;
    console.log(
      `[supplier-scorecard] Trend VBScript closed after ${elapsed}ms with code ${code}`,
    );

    const fatalError =
      code !== 0 ||
      (errorOutput &&
        !errorOutput.trim().startsWith("SELECT") &&
        !errorOutput.trim().startsWith("SQL>>>"));

    if (fatalError) {
      console.error(
        `[supplier-scorecard] VBScript failed (code=${code}): ${errorOutput.trim()}`,
      );
      return res.status(500).json({
        error: `VBScript error (code ${code}): ${errorOutput.trim()}`,
      });
    }

    try {
      const sanitized = output.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
      console.log(
        "[supplier-scorecard] RAW OUTPUT >>>",
        sanitized.substring(0, 200),
        "<<< END",
      );
      const data = JSON.parse(sanitized);
      if (debug) console.debug("[supplier-scorecard] Trend data processed");
      res.json(data);
    } catch (err) {
      console.error(
        "[supplier-scorecard] Trend JSON parse error:",
        err.message,
      );
      console.error(
        "[supplier-scorecard] Output sample:",
        output.substring(0, 500),
      );
      res.status(500).json({ error: `JSON parse error: ${err.message}` });
    }
  });

  child.on("error", (err) => {
    console.error("[supplier-scorecard] Failed to spawn trend VBScript:", err);
    res.status(500).json({ error: `Failed to spawn VBScript: ${err.message}` });
  });
});

module.exports = router;
