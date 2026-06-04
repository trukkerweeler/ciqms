// routes/processcert.js - Process Certificate implementation
const express = require("express");
const path = require("path");
const { execFile } = require("child_process");
const util = require("util");

const router = express.Router();

const execFileAsync = util.promisify(execFile);

// ========================================================================
// LEGACY ENDPOINTS (VBS-based)
// ========================================================================

router.get("/processcert-coc", (req, res) => {
  const { job, selectedIndices } = req.query;

  if (!job) return res.status(400).json({ error: "Missing job parameter" });
  if (!/^\d+$/.test(job))
    return res.status(400).json({ error: "Invalid job number" });

  const vbsPath = path.join(__dirname, "processcert-coc.vbs");
  const cscript32 = process.env.SYSTEMROOT
    ? path.join(process.env.SYSTEMROOT, "SysWOW64", "cscript.exe")
    : "C:/Windows/SysWOW64/cscript.exe";

  const args = ["//Nologo", vbsPath, job];
  if (selectedIndices) args.push(selectedIndices);

  execFile(cscript32, args, { windowsHide: true }, (err, stdout, stderr) => {
    console.log("processcert-coc stderr:", stderr);
    if (err)
      return res
        .status(500)
        .json({ error: "VBS execution failed", details: stderr });
    try {
      res.json(JSON.parse(stdout));
    } catch (e) {
      res.status(500).json({
        error: "Failed to parse VBS output",
        raw: stdout,
        stderr,
      });
    }
  });
});

router.get("/processcert-detail", (req, res) => {
  const { job, suffix } = req.query;

  if (!job || !suffix)
    return res.status(400).json({ error: "Missing job or suffix" });
  if (!/^\d+$/.test(job) || !/^\d+$/.test(suffix))
    return res.status(400).json({ error: "Invalid job or suffix" });

  const vbsPath = path.join(__dirname, "processcert-detail.vbs");
  const cscript32 = process.env.SYSTEMROOT
    ? path.join(process.env.SYSTEMROOT, "SysWOW64", "cscript.exe")
    : "C:/Windows/SysWOW64/cscript.exe";

  execFile(
    cscript32,
    ["//Nologo", vbsPath, job, suffix],
    { windowsHide: true },
    (err, stdout, stderr) => {
      console.log("processcert-detail stderr:", stderr);
      if (err)
        return res
          .status(500)
          .json({ error: "VBS execution failed", details: stderr });
      try {
        console.log("RAW VBS OUTPUT >>>");
console.log(stdout);
console.log("<<< END RAW VBS OUTPUT");

        res.json(JSON.parse(stdout));
      } catch (e) {
        res.status(500).json({
          error: "Failed to parse VBS output",
          raw: stdout,
          stderr,
        });
      }
    },
  );
});

// ========================================================================
// NEW PROCESSCERT2 IMPLEMENTATION (VBS-based)
// ========================================================================

/**
 * Helper to get 32-bit cscript.exe path
 */
function getCscript32() {
  return process.env.SYSTEMROOT
    ? path.join(process.env.SYSTEMROOT, "SysWOW64", "cscript.exe")
    : "C:/Windows/SysWOW64/cscript.exe";
}

/**
 * Call VBS script and parse JSON response
 */
function callVBS(vbsPath, args) {
  return new Promise((resolve, reject) => {
    const cscript32 = getCscript32();
    execFile(
      cscript32,
      ["//Nologo", vbsPath, ...args],
      { windowsHide: true },
      (err, stdout, stderr) => {
        if (err) {
          console.error(
            `VBS execution failed (${path.basename(vbsPath)}):`,
            stderr,
          );
          reject(new Error(`VBS execution failed: ${stderr}`));
        } else {
          try {
  // console.log("RAW VBS OUTPUT >>>");
  // console.log(stdout);
  // console.log("<<< END RAW VBS OUTPUT");

  resolve(JSON.parse(stdout));
} catch (e) {
  console.error(
    `Failed to parse VBS output from ${path.basename(vbsPath)}`
  );
  console.error("RAW VBS OUTPUT THAT FAILED >>>");
  console.error(stdout);
  console.error("<<< END RAW VBS OUTPUT");

  reject(new Error(`Failed to parse VBS JSON output`));
}

        }
      },
    );
  });
}

router.get("/build-cert", async (req, res) => {
  const { job, selectedIndices } = req.query;

  if (!job || !/^\d+$/.test(job)) {
    return res.status(400).json({ error: "Invalid or missing job parameter" });
  }

  try {
    // STEP 1 — Call processcert-coc.vbs to get all parent J52s
    console.log(
      `[build-cert] Step 1: Getting parent transactions for job ${job}`,
    );
    const cocVbsPath = path.join(__dirname, "processcert-coc.vbs");
    const cocData = await callVBS(cocVbsPath, [job]);

    if (!cocData.success || !Array.isArray(cocData.step1_j52_transactions)) {
      return res.status(404).json({
        error: "No J52 transactions found for this job",
        details: cocData.error || "Unknown error from VBS",
      });
    }

    const parentTransactions = cocData.step1_j52_transactions;
    console.log(
      `[build-cert] Found ${parentTransactions.length} parent transaction(s)`,
    );

    // STEP 2 — Filter by selectedIndices
let selectedParents = [];

if (typeof selectedIndices === "string" && selectedIndices.trim() !== "") {
  const indices = selectedIndices
    .split(",")
    .map((i) => parseInt(i, 10))
    .filter((i) => !isNaN(i));

  selectedParents = parentTransactions.filter((_, idx) =>
    indices.includes(idx)
  );
} else {
  selectedParents = parentTransactions;
}

console.log(
  `[build-cert] Processing ${selectedParents.length} selected parent(s)`
);

// STEP 3 — For each selected parent, call processcert-detail.vbs
const certificateData = [];
const detailVbsPath = path.join(__dirname, "processcert-detail.vbs");

for (const parent of selectedParents) {
  const { job, suffix } = parent;
  console.log(`[build-cert] Getting hierarchy for ${job}-${suffix}`);

  try {
    const detailData = await callVBS(detailVbsPath, [job, suffix]);

    certificateData.push({
      parentJ52: parent,
      hierarchy: {
        operations: detailData.operations || [],
        itemHistory: detailData.itemHistory || []
      }
    });
  } catch (err) {
    console.error(
      `[build-cert] Error getting detail for ${job}-${suffix}:`,
      err.message
    );
    certificateData.push({
      parentJ52: parent,
      error: err.message
    });
  }
}


    res.json({
      success: true,
      job,
      selectedIndices: selectedIndices || "0 (default)",
      certificateData,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[build-cert] Error:", err.message);
    res.status(500).json({
      error: "Certificate generation failed",
      details: err.message,
    });
  }
});

module.exports = router;
