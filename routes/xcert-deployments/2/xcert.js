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

// GET /xcert/processcert-coc?job=122166&selectedIndices=0,1,3
// Steps 1-3: Fetch J52 transactions, accept selected indices, build chain-of-custody links
// ITEM_HISTORY-based (not INVENTORY_HIST) to ensure SERIAL_NUMBER is available
router.get("/processcert-coc", (req, res) => {
  const { job, selectedIndices } = req.query;

  // Validate job parameter
  if (!job) {
    return res.status(400).json({ error: "Missing job parameter" });
  }
  if (!/^\d+$/.test(job)) {
    return res.status(400).json({ error: "Invalid job number" });
  }

  const vbsPath = path.join(__dirname, "processcert-coc.vbs");
  const cscript32 = process.env.SYSTEMROOT
    ? path.join(process.env.SYSTEMROOT, "SysWOW64", "cscript.exe")
    : "C:/Windows/SysWOW64/cscript.exe";

  // Build command arguments: job and optional selectedIndices
  const args = ["//Nologo", vbsPath, job];
  if (selectedIndices) {
    args.push(selectedIndices);
  }

  execFile(cscript32, args, { windowsHide: true }, (err, stdout, stderr) => {
    console.log("processcert-coc VBS stderr:", stderr);
    console.log("processcert-coc VBS stdout:", stdout);
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
  });
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
