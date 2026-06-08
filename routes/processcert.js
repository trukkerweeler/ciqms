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
      return res.status(500).json({
        error: "VBS execution failed",
        details: (stderr || stdout || "").trim(),
      });
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
        return res.status(500).json({
          error: "VBS execution failed",
          details: (stderr || stdout || "").trim(),
        });
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
 * Only includes J55/J50/J51 transactions STRICTLY AFTER the previous J52 for this suffix
 * and AT OR BEFORE the selected parent J52's completion timestamp.
 */
function extractChildJobsFromItemHistory(
  parentJob,
  parentSuffix,
  itemHistory,
  parentDateHistory,
  parentTimeItemHistory,
  prevDateHistory,
  prevTimeItemHistory,
) {
  const childJobs = new Map(); // Map of "JJJJJJ-SSS" -> {job, suffix, firstJ55}

  if (!Array.isArray(itemHistory)) return Array.from(childJobs.values());

  // Upper bound: at or before the selected J52
  const parentTs = `${parentDateHistory || ""}${parentTimeItemHistory || ""}`;
  // Lower bound: strictly after the previous J52 for this suffix (empty string = no lower bound)
  const prevTs = `${prevDateHistory || ""}${prevTimeItemHistory || ""}`;

  for (const item of itemHistory) {
    if (parentTs || prevTs) {
      const itemTs = `${item.dateHistory || ""}${item.timeItemHistory || ""}`;
      if (parentTs && itemTs > parentTs) continue; // too new
      if (prevTs && itemTs <= prevTs) continue; // belongs to a prior batch
    }
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

  // Second pass: if the lower bound excluded a child job that doesn't appear
  // anywhere in the window result (i.e., the child was only ever pulled before prevTs
  // and is therefore unique to this batch), include it anyway.
  // This handles cases where an older sub-job's material was legitimately consumed
  // in the current completion batch, just pulled/prepared earlier.
  if (prevTs) {
    for (const item of itemHistory) {
      const itemTs = `${item.dateHistory || ""}${item.timeItemHistory || ""}`;
      if (parentTs && itemTs > parentTs) continue; // still too new
      if (itemTs > prevTs) continue; // already handled in first pass

      const codeTransaction = (item.codeTransaction || "").trim();
      if (
        (codeTransaction === "J55" ||
          codeTransaction === "J50" ||
          codeTransaction === "J51") &&
        item.serialNumber
      ) {
        const serialNum = item.serialNumber.trim();
        const match = serialNum.match(/^(\d{6})-(\d{3})/);
        if (match) {
          const childJob = match[1];
          const childSuffix = match[2];
          const key = `${childJob}-${childSuffix}`;

          if (childJob === parentJob && childSuffix === parentSuffix) continue;

          // Only add if this child was NOT already found in the main window.
          // If it IS in the main window, the lower bound correctly excluded this
          // earlier pull (it belongs to a prior batch for that child).
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

  // Build a map from base-hundred SEQ -> PO reference (from JOB_DETAIL / JOB_HIST_DTL, LMO='O' rows).
  // JOB_DETAIL rows use the sub-op seq (e.g. 1250) so we normalize to the base op seq (e.g. 1200)
  // so it matches when we look up by the base operation's seq number.
  const poBySeq = new Map();
  const allPORefs = []; // all distinct PO references, for fallback
  if (Array.isArray(jobDetail)) {
    for (const row of jobDetail) {
      const seqNum = parseInt(row.seq, 10);
      const ref = (row.reference || "").trim();
      if (!isNaN(seqNum) && ref) {
        const baseSeq = Math.floor(seqNum / 100) * 100;
        if (!poBySeq.has(baseSeq)) {
          poBySeq.set(baseSeq, ref);
        }
        // Also store exact seq so we can match directly
        if (!poBySeq.has(seqNum)) {
          poBySeq.set(seqNum, ref);
        }
        if (!allPORefs.includes(ref)) allPORefs.push(ref);
      }
    }
  }
  // Fallback: if there is exactly one distinct PO ref, use it when seq-based lookup misses
  const singlePOFallback = allPORefs.length === 1 ? allPORefs[0] : "";

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
  for (const [groupKey, group] of groups) {
    if (!group.base) {
      // No base op found (e.g. JOB_HIST_OPS only recorded the sub-op row).
      // Check whether any sub-op indicates outside processing and whether a
      // PO reference exists for this base-hundred group — if so, promote the
      // first sub-op as the representative outside processing row.
      const poNumber =
        typeof groupKey === "number"
          ? poBySeq.get(groupKey) || singlePOFallback
          : singlePOFallback;
      const isOutsideSub = group.subs.some(
        (s) =>
          (s.lmo || "").toUpperCase() === "O" ||
          (s.partWcOutside || "").toUpperCase() === "Y",
      );
      if ((poNumber || isOutsideSub) && group.subs.length > 0) {
        const firstSub = group.subs[0];
        result.push({
          ...firstSub,
          outsideProcessing: true,
          poNumber,
          subOpDescription: (firstSub.description || "").trim(),
        });
      } else {
        result.push(...group.subs);
      }
      continue;
    }

    const baseSeqNum = parseInt(group.base.seq, 10);
    const poNumber = poBySeq.get(baseSeqNum) || singlePOFallback;

    // Determine if this is an outside processing operation:
    //   1. LMO = 'O' in JOB_OPERATIONS / JOB_HIST_OPS (most reliable)
    //   2. ROUTER_LINE.PART_WC_OUTSIDE = 'Y' (secondary check)
    //   3. Has sub-operations (N01-N99 pattern)
    const isOutside =
      (group.base.lmo || "").toUpperCase() === "O" ||
      (group.base.partWcOutside || "").toUpperCase() === "Y" ||
      group.subs.length > 0;

    if (!isOutside) {
      result.push(group.base);
    } else {
      const subOpDescription = (group.subs[0]?.description || "").trim();
      result.push({
        ...group.base,
        outsideProcessing: true,
        poNumber,
        subOpDescription,
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
    // Pass DB credentials directly — Node already loaded them from .env at startup
    execFile(
      cscript32,
      ["//Nologo", vbsPath, ...args],
      {
        windowsHide: true,
        env: {
          ...process.env,
          CIQMS_GLOBAL_DSN: process.env.GLOBAL_DSN || "",
          CIQMS_GLOBAL_UID: process.env.GLOBAL_UID || "",
          CIQMS_GLOBAL_PWD: process.env.GLOBAL_PWD || "",
        },
      },
      (err, stdout, stderr) => {
        if (err) {
          const errDetail = (stderr || stdout || "").trim();
          console.error(
            `VBS execution failed (${path.basename(vbsPath)}):`,
            errDetail,
          );
          reject(new Error(`VBS execution failed: ${errDetail}`));
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

          // Find the previous J52 for this same job+suffix to use as a lower-bound
          // so we only pick up J55 pulls that belong to this specific completion batch.
          const parentTs = `${parent.dateHistory || ""}${parent.timeItemHistory || ""}`;
          const sameSuffixJ52s = parentTransactions
            .filter((t) => t.job === job && t.suffix === suffix)
            .map((t) => ({
              ts: `${t.dateHistory || ""}${t.timeItemHistory || ""}`,
              t,
            }))
            .sort((a, b) => (a.ts < b.ts ? -1 : a.ts > b.ts ? 1 : 0));

          const thisIndex = sameSuffixJ52s.findIndex((e) => e.ts === parentTs);
          const prevEntry =
            thisIndex > 0 ? sameSuffixJ52s[thisIndex - 1] : null;

          const fallbackChildren = extractChildJobsFromItemHistory(
            job,
            suffix,
            parentDetail.itemHistory,
            parent.dateHistory,
            parent.timeItemHistory,
            prevEntry?.t.dateHistory,
            prevEntry?.t.timeItemHistory,
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
                part: childDetail.part || "",
                partDescription: childDetail.partDescription || "",
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
          partDescription: parentDetail.partDescription || "",
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
