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
 * Extract unique child jobs from itemHistory
 * Looks for J55 transactions that reference different job numbers
 */
function extractChildJobsFromItemHistory(parentJob, parentSuffix, itemHistory) {
  const childJobs = new Map(); // Map of "JJJJJJ-SSS" -> {job, suffix, firstJ55}

  if (!Array.isArray(itemHistory)) return Array.from(childJobs.values());

  for (const item of itemHistory) {
    // Look for J55/J50/J51 transactions (material pulls) — trim to handle fixed-width DB fields
    const codeTransaction = (item.codeTransaction || "").trim();
    if (
      (codeTransaction === "J55" ||
        codeTransaction === "J50" ||
        codeTransaction === "J51") &&
      item.serialNumber
    ) {
      const serialNum = item.serialNumber.trim();
      // Parse serial number: format is "JJJJJJ-SSS"
      const match = serialNum.match(/^(\d{6})-(\d{3})/);
      if (match) {
        const childJob = match[1];
        const childSuffix = match[2];
        const key = `${childJob}-${childSuffix}`;

        // Skip if it's the parent itself
        if (childJob === parentJob && childSuffix === parentSuffix) continue;

        // Store first occurrence of this child
        if (!childJobs.has(key)) {
          childJobs.set(key, {
            job: childJob,
            suffix: childSuffix,
            firstJ55: item,
          });
        }
      }
    }
  }

  return Array.from(childJobs.values());
}

/**
 * Group sub-operations into their base operation.
 *
 * Operations with seq N01–N99 (within the same base hundred N00) are
 * sub-operations of N00. When a sub-op exists, the base op is kept and
 * marked outsideProcessing=true with the PO from jobDetail (looked up by
 * the base op's operation code). Sub-op rows are suppressed.
 *
 * @param {Array} operations  - operations array from processcert-detail.vbs
 * @param {Array} jobDetail   - jobDetail array from processcert-detail.vbs
 * @returns {Array} merged operations
 */
function groupSubOperations(operations, jobDetail) {
  if (!Array.isArray(operations) || operations.length === 0) return operations;

  // Build a map from operation code -> PO reference (from JOB_DETAIL)
  const poByOpCode = new Map();
  if (Array.isArray(jobDetail)) {
    for (const row of jobDetail) {
      const opCode = (row.operation || "").trim();
      const ref = (row.reference || "").trim();
      if (opCode && ref && !poByOpCode.has(opCode)) {
        poByOpCode.set(opCode, ref);
      }
    }
  }

  // Group by base hundred: floor(parseInt(seq) / 100) * 100
  const groups = new Map(); // baseKey (number) -> { base: op, subs: [op, ...] }

  for (const op of operations) {
    const seqNum = parseInt(op.seq, 10);
    if (isNaN(seqNum)) {
      // Can't parse — pass through unchanged in its own group
      const key = `unparseable_${op.seq}`;
      groups.set(key, { base: op, subs: [] });
      continue;
    }
    const baseKey = Math.floor(seqNum / 100) * 100;
    const isBase = seqNum % 100 === 0;

    if (!groups.has(baseKey)) {
      groups.set(baseKey, { base: null, subs: [] });
    }
    const group = groups.get(baseKey);
    if (isBase) {
      group.base = op;
    } else {
      group.subs.push(op);
    }
  }

  // Build merged output
  const result = [];
  for (const [, group] of groups) {
    if (!group.base) {
      // No base op — push sub-ops as-is (shouldn't normally happen)
      result.push(...group.subs);
      continue;
    }

    if (group.subs.length === 0) {
      // No sub-ops — pass base op through unchanged
      result.push(group.base);
    } else {
      // Sub-ops exist — merge: use base op data, flag outside processing,
      // look up PO by base op's operation code
      const baseOpCode = (group.base.operation || "").trim();
      const poNumber = poByOpCode.get(baseOpCode) || "";
      result.push({
        ...group.base,
        outsideProcessing: true,
        poNumber,
      });
      // Sub-op rows are intentionally suppressed
    }
  }

  return result;
}

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
 * Returns { parsed: {...}, raw: "..." } so we can track both
 */
function callVBS(vbsPath, args, includeRaw = false) {
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
            console.log("RAW VBS OUTPUT >>>");
            console.log(stdout);
            console.log("<<< END RAW VBS OUTPUT");

            const parsed = JSON.parse(stdout);
            if (includeRaw) {
              resolve({ parsed, raw: stdout });
            } else {
              resolve(parsed);
            }
          } catch (e) {
            console.error(
              `Failed to parse VBS output from ${path.basename(vbsPath)}`,
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

  const debugInfo = {
    rawVbsOutputs: {}, // Store raw outputs keyed by description
  };

  try {
    // STEP 1 — Call processcert-coc.vbs to get all parent J52s
    console.log(
      `[build-cert] Step 1: Getting parent transactions for job ${job}`,
    );
    const cocVbsPath = path.join(__dirname, "processcert-coc.vbs");
    const cocResult = await callVBS(cocVbsPath, [job], true); // includeRaw=true
    const cocData = cocResult.parsed;
    debugInfo.rawVbsOutputs["processcert-coc.vbs (parent list)"] =
      cocResult.raw;

    const parentTransactions = cocData.step1_j52_transactions;
    const cocLinks = Array.isArray(cocData.step3_coc_links)
      ? cocData.step3_coc_links
      : [];

    console.log("[build-cert] step3_coc_links from VBS:");
    console.log(JSON.stringify(cocLinks, null, 2));

    if (!cocData.success || !Array.isArray(cocData.step1_j52_transactions)) {
      return res.status(404).json({
        error: "No J52 transactions found for this job",
        details: cocData.error || "Unknown error from VBS",
        debugInfo,
      });
    }

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
        indices.includes(idx),
      );
    } else {
      selectedParents = parentTransactions;
    }

    console.log(
      `[build-cert] Processing ${selectedParents.length} selected parent(s)`,
    );

    // STEP 3 — For each selected parent, call processcert-detail.vbs
    const certificateData = [];
    const detailVbsPath = path.join(__dirname, "processcert-detail.vbs");

    for (const parent of selectedParents) {
      const { job, suffix } = parent;
      console.log(`[build-cert] Getting hierarchy for ${job}-${suffix}`);

      try {
        //
        // 1. Fetch PARENT job operations + itemHistory
        //
        const parentDetailResult = await callVBS(
          detailVbsPath,
          [job, suffix],
          true,
        );
        const parentDetail = parentDetailResult.parsed;
        debugInfo.rawVbsOutputs[`processcert-detail.vbs (${job}-${suffix})`] =
          parentDetailResult.raw;

        //
        // 2. Find all CoC links where this parent_j52 matches
        //
        let linksForParent = cocLinks.filter(
          (link) =>
            link.parent_j52.job === parent.job &&
            link.parent_j52.suffix === parent.suffix &&
            link.parent_j52.dateHistory === parent.dateHistory &&
            link.parent_j52.timeItemHistory === parent.timeItemHistory,
        );

        // FALLBACK: If cocLinks is empty or no links found for this parent,
        // extract children from the parent's itemHistory (J55 transactions)
        if (linksForParent.length === 0 && parentDetail.itemHistory) {
          console.log(
            `[build-cert] cocLinks empty for ${job}-${suffix}, extracting from itemHistory`,
          );
          const fallbackChildren = extractChildJobsFromItemHistory(
            job,
            suffix,
            parentDetail.itemHistory,
          );
          linksForParent = fallbackChildren.map((child) => ({
            parent_j52: parent,
            child_job: child,
          }));
          console.log(
            `[build-cert] Found ${linksForParent.length} children via itemHistory fallback`,
          );
        }

        //
        // 3. For each child job, fetch its operations + itemHistory
        //
        const childHierarchies = [];

        for (const link of linksForParent) {
          const child = link.child_job;
          if (!child || !child.job || !child.suffix) continue;

          console.log(
            `[build-cert] Getting child hierarchy for ${child.job}-${child.suffix}`,
          );

          try {
            const childDetailResult = await callVBS(
              detailVbsPath,
              [child.job, child.suffix],
              true,
            );
            const childDetail = childDetailResult.parsed;
            debugInfo.rawVbsOutputs[
              `processcert-detail.vbs (child ${child.job}-${child.suffix})`
            ] = childDetailResult.raw;

            childHierarchies.push({
              childJob: {
                job: child.job,
                suffix: child.suffix,
                serialNumber:
                  child.firstJ55?.serialNumber ||
                  `${child.job}-${child.suffix}`,
                quantity: child.firstJ55?.quantity || 0,
                dateHistory: child.firstJ55?.dateHistory || "",
              },
              hierarchy: {
                operations: groupSubOperations(
                  childDetail.operations || [],
                  childDetail.jobDetail || [],
                ),
                itemHistory: childDetail.itemHistory || [],
              },
            });
          } catch (childErr) {
            console.error(
              `[build-cert] Failed to get detail for child ${child.job}-${child.suffix}:`,
              childErr.message,
            );
            debugInfo.rawVbsOutputs[
              `processcert-detail.vbs (child ${child.job}-${child.suffix}) ERROR`
            ] = childErr.message;
            // Continue to next child — one failure does not abort others
          }
        }

        //
        // 4. Push final combined structure
        //
        certificateData.push({
          parentJ52: parent,
          hierarchy: {
            operations: groupSubOperations(
              parentDetail.operations || [],
              parentDetail.jobDetail || [],
            ),
            itemHistory: parentDetail.itemHistory || [],
          },
          childJobs: childHierarchies,
        });
      } catch (err) {
        console.error(
          `[build-cert] Error getting detail for ${job}-${suffix}:`,
          err.message,
        );
        certificateData.push({
          parentJ52: parent,
          error: err.message,
        });
      }
    }

    res.json({
      success: true,
      job,
      selectedIndices: selectedIndices || "0 (default)",
      certificateData,
      debugInfo, // Include raw VBS outputs for debugging
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[build-cert] Error:", err.message);
    res.status(500).json({
      error: "Certificate generation failed",
      details: err.message,
      debugInfo,
    });
  }
});

module.exports = router;
