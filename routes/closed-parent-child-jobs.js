const express = require("express");
const path = require("path");
const { spawn } = require("child_process");

const router = express.Router();

function runGlobalQuery() {
  return new Promise((resolve, reject) => {
    const vbsPath = path.join(__dirname, "closed-parent-child-jobs.vbs");
    const cscriptPath = path.join(
      process.env.SYSTEMROOT || "C:\\Windows",
      "SysWOW64",
      "cscript.exe",
    );
    const child = spawn(cscriptPath, ["//Nologo", vbsPath]);
    let output = "";
    let errorOutput = "";

    child.stdout.on("data", (data) => {
      output += data.toString();
    });
    child.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });
    child.on("error", (error) => {
      reject(new Error(`Failed to start Global query: ${error.message}`));
    });
    child.on("close", (code) => {
      const sanitized = output
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
        .trim();
      if (code !== 0 || !sanitized) {
        reject(
          new Error(
            `Global query failed (code ${code}): ${
              errorOutput.trim() || "No output"
            }`,
          ),
        );
        return;
      }

      try {
        const data = JSON.parse(sanitized);
        if (data.error) reject(new Error(data.error));
        else resolve(Array.isArray(data) ? data : []);
      } catch (error) {
        reject(new Error(`Invalid Global query response: ${error.message}`));
      }
    });
  });
}

function number(value) {
  return Number.parseFloat(value) || 0;
}

router.get("/", async (_req, res) => {
  try {
    const rows = await runGlobalQuery();
    const jobs = rows.map((row) => ({
      childJob: String(row.CHILD_JOB || "").trim(),
      childSuffix: String(row.CHILD_SUFFIX || "").trim(),
      childPart: String(row.CHILD_PART || "").trim(),
      childCustomer: String(row.CHILD_CUSTOMER || "").trim(),
      childQtyOrder: number(row.CHILD_QTY_ORDER),
      childQtyCompleted: number(row.CHILD_QTY_COMPLETED),
      childQtyRemaining: Math.max(
        0,
        number(row.CHILD_QTY_ORDER) - number(row.CHILD_QTY_COMPLETED),
      ),
      childDateOpened: String(row.CHILD_DATE_OPENED || "").trim(),
      childDateDue: String(row.CHILD_DATE_DUE || "").trim(),
      childDateClosed: String(row.CHILD_DATE_CLOSED || "").trim(),
      parentJob: String(row.PARENT_JOB || "").trim(),
      parentSuffix: String(row.PARENT_SUFFIX || "").trim(),
      parentPart: String(row.PARENT_PART || "").trim(),
      parentDateClosed: String(row.PARENT_DATE_CLOSED || "").trim(),
    }));

    res.json({
      summary: {
        childJobs: jobs.length,
        withRemainingQuantity: jobs.filter((job) => job.childQtyRemaining > 0)
          .length,
        totalRemainingQuantity: jobs.reduce(
          (sum, job) => sum + job.childQtyRemaining,
          0,
        ),
      },
      jobs,
    });
  } catch (error) {
    console.error("[closed-parent-child-jobs]", error);
    res.status(500).json({ error: "Unable to load closed-parent child jobs" });
  }
});

module.exports = router;
