const express = require("express");
const { spawn } = require("child_process");
const path = require("path");
const router = express.Router();

function parseWorkOrder(workOrder) {
  const text = String(workOrder || "").trim();
  if (!text) return { job: "", suffix: "000" };
  const dashIdx = text.lastIndexOf("-");
  if (dashIdx > 0) {
    return {
      job: text.slice(0, dashIdx),
      suffix: text.slice(dashIdx + 1).padStart(3, "0"),
    };
  }
  return { job: text, suffix: "000" };
}

// GET /special-process-lookup?workOrder=12345-000
// Backward-compatible: /special-process-lookup?job=12345&suffix=000
router.get("/", (req, res) => {
  const { workOrder, job: queryJob, suffix: querySuffix } = req.query;
  const parsed = workOrder ? parseWorkOrder(workOrder) : null;
  const job = String(parsed?.job || queryJob || "").trim();
  const suffix = String(parsed?.suffix || querySuffix || "000").trim();

  if (!job) {
    return res
      .status(400)
      .json({ error: "workOrder or job query parameter is required" });
  }

  const vbsPath = path.join(__dirname, "special-process-lookup.vbs");
  const cscriptPath = path.join(
    process.env.SYSTEMROOT,
    "SysWOW64",
    "cscript.exe",
  );

  const child = spawn(cscriptPath, ["//Nologo", vbsPath, job, suffix]);

  let output = "";
  let errorOutput = "";

  child.stdout.on("data", (data) => {
    output += data.toString();
  });
  child.stderr.on("data", (data) => {
    errorOutput += data.toString();
  });

  child.on("close", (code) => {
    if (code !== 0) {
      console.error(
        `special-process-lookup VBS failed (code=${code}): ${errorOutput}`,
      );
      return res.status(500).json({ error: "Lookup script failed" });
    }
    try {
      const sanitized = output
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
        .trim();
      const data = JSON.parse(sanitized);
      res.json(data);
    } catch (err) {
      console.error("special-process-lookup parse error:", err, "raw:", output);
      res.status(500).json({ error: "Invalid response from lookup" });
    }
  });
});

module.exports = router;
