// routes/xcert.js - Express route for xcert
const express = require("express");
const { execFile } = require("child_process");
const path = require("path");
const router = express.Router();

// POST /xcert/process
// Body: { baseWorkorder: "123456", suffix: "000", operationCodes: ["D172"] or [] }
router.post("/process", (req, res) => {
  const { baseWorkorder, suffix, operationCodes } = req.body;
  if (!baseWorkorder || !suffix || !Array.isArray(operationCodes)) {
    return res.status(400).json({
      error: "Missing baseWorkorder, suffix, or operationCodes (must be array)",
    });
  }
  if (!/^\d{6}$/.test(baseWorkorder)) {
    return res.status(400).json({ error: "Invalid baseWorkorder" });
  }
  if (!/^\d{3}$/.test(suffix)) {
    return res.status(400).json({ error: "Invalid suffix (must be 3 digits)" });
  }

  const vbsPath = path.join(__dirname, "xcert.vbs");
  const cscript32 = process.env.SYSTEMROOT
    ? path.join(process.env.SYSTEMROOT, "SysWOW64", "cscript.exe")
    : "C:/Windows/SysWOW64/cscript.exe";

  // Pass baseWorkorder, suffix, and operationCodes as comma-separated string (empty string if no codes)
  const operationCodesStr = operationCodes.join(",");

  execFile(
    cscript32,
    ["//Nologo", vbsPath, baseWorkorder, suffix, operationCodesStr],
    { windowsHide: true },
    (err, stdout, stderr) => {
      console.log("xcert VBS stderr:", stderr);
      console.log("xcert VBS stdout:", stdout);
      if (err) {
        return res
          .status(500)
          .json({ error: "VBS execution failed", details: stderr });
      }
      try {
        const data = JSON.parse(stdout);
        res.json(data);
      } catch (e) {
        res.status(500).json({
          error: "Failed to parse VBS output",
          raw: stdout,
          stderr: stderr,
        });
      }
    },
  );
});

// GET /xcert/inventory-hist?job=122361&suffix=000&codeTransaction=J52
// Query inventory history transactions (GET only - read only)
router.get("/inventory-hist", (req, res) => {
  const { job, suffix, codeTransaction } = req.query;

  // Validate parameters
  if (!job || !suffix) {
    return res.status(400).json({ error: "Missing job or suffix parameter" });
  }
  if (!/^\d+$/.test(job)) {
    return res.status(400).json({ error: "Invalid job number" });
  }
  if (!/^\d{3}$/.test(suffix)) {
    return res.status(400).json({ error: "Invalid suffix (must be 3 digits)" });
  }

  const vbsPath = path.join(__dirname, "xcert-inventory-hist.vbs");
  const cscript32 = process.env.SYSTEMROOT
    ? path.join(process.env.SYSTEMROOT, "SysWOW64", "cscript.exe")
    : "C:/Windows/SysWOW64/cscript.exe";

  // Default code transaction to 'J52' if not provided
  const code = codeTransaction || "J52";

  execFile(
    cscript32,
    ["//Nologo", vbsPath, job, suffix, code],
    { windowsHide: true },
    (err, stdout, stderr) => {
      console.log("xcert inventory-hist VBS stderr:", stderr);
      console.log("xcert inventory-hist VBS stdout:", stdout);
      if (err) {
        return res
          .status(500)
          .json({ error: "VBS execution failed", details: stderr });
      }
      try {
        const data = JSON.parse(stdout);
        res.json(data);
      } catch (e) {
        res.status(500).json({
          error: "Failed to parse VBS output",
          raw: stdout,
          stderr: stderr,
        });
      }
    },
  );
});

// GET /xcert?baseWorkorder=123456
router.get("/", (req, res) => {
  const baseWorkorder = req.query.baseWorkorder;
  if (!/^\d{6}$/.test(baseWorkorder)) {
    return res.status(400).json({ error: "Invalid baseWorkorder" });
  }
  const vbsPath = path.join(__dirname, "xcert.vbs");
  // Always use 32-bit cscript.exe for ODBC compatibility
  const cscript32 = process.env.SYSTEMROOT
    ? path.join(process.env.SYSTEMROOT, "SysWOW64", "cscript.exe")
    : "C:/Windows/SysWOW64/cscript.exe";
  execFile(
    cscript32,
    ["//Nologo", vbsPath, baseWorkorder],
    { windowsHide: true },
    (err, stdout, stderr) => {
      console.log("xcert VBS stderr:", stderr);
      console.log("xcert VBS stdout:", stdout);
      if (err) {
        return res
          .status(500)
          .json({ error: "VBS execution failed", details: stderr });
      }
      try {
        const data = JSON.parse(stdout);
        res.json(data);
      } catch (e) {
        res.status(500).json({
          error: "Failed to parse VBS output",
          raw: stdout,
          stderr: stderr,
        });
      }
    },
  );
});

module.exports = router;
