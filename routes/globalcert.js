// routes/globalcert.js - Express route for globalcert
const express = require("express");
const { execFile } = require("child_process");
const path = require("path");
const router = express.Router();

// POST /globalcert/process
// Body: { baseWorkorder: "123456", suffix: "000", operationCodes: ["D172"] or [], codeTransaction: "J55", dateHistory: "241210" (optional), invHistTime: "15070267" (optional) }
router.post("/process", (req, res) => {
  const {
    baseWorkorder,
    suffix,
    operationCodes,
    codeTransaction,
    dateHistory,
    invHistTime,
  } = req.body;
  if (
    !baseWorkorder ||
    !suffix ||
    !Array.isArray(operationCodes) ||
    !codeTransaction
  ) {
    return res.status(400).json({
      error:
        "Missing baseWorkorder, suffix, operationCodes (must be array), or codeTransaction",
    });
  }
  if (!/^\d{6}$/.test(baseWorkorder)) {
    return res.status(400).json({ error: "Invalid baseWorkorder" });
  }
  if (!/^\d{3}$/.test(suffix)) {
    return res.status(400).json({ error: "Invalid suffix (must be 3 digits)" });
  }

  const vbsPath = path.join(__dirname, "globalcert.vbs");
  const cscript32 = process.env.SYSTEMROOT
    ? path.join(process.env.SYSTEMROOT, "SysWOW64", "cscript.exe")
    : "C:/Windows/SysWOW64/cscript.exe";

  // Pass baseWorkorder, suffix, operationCodes, codeTransaction, and optional date/time
  const operationCodesStr = operationCodes.join(",");

  execFile(
    cscript32,
    [
      "//Nologo",
      vbsPath,
      baseWorkorder,
      suffix,
      operationCodesStr,
      codeTransaction,
      dateHistory || "",
      invHistTime || "",
    ],
    { windowsHide: true },
    (err, stdout, stderr) => {
      console.log("globalcert VBS stderr:", stderr);
      console.log("globalcert VBS stdout:", stdout);
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

// GET /globalcert/processcert-coc?job=122166&selectedIndices=0,1,3
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

// GET /globalcert/part-description?part=521572
// Query part description from GLOBALCERT using VBS
router.get("/part-description", (req, res) => {
  const { part } = req.query;

  if (!part) {
    return res.status(400).json({ error: "Missing part parameter" });
  }

  const vbsPath = path.join(__dirname, "globalcert-part-description.vbs");
  const cscript32 = process.env.SYSTEMROOT
    ? path.join(process.env.SYSTEMROOT, "SysWOW64", "cscript.exe")
    : "C:/Windows/SysWOW64/cscript.exe";

  execFile(
    cscript32,
    ["//Nologo", vbsPath, part],
    { windowsHide: true },
    (err, stdout, stderr) => {
      console.log("globalcert part-description VBS stderr:", stderr);
      console.log("globalcert part-description VBS stdout:", stdout);
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

// GET /globalcert?baseWorkorder=123456 (generic root - must be AFTER specific routes)
router.get("/", (req, res) => {
  const baseWorkorder = req.query.baseWorkorder;
  if (!/^\d{6}$/.test(baseWorkorder)) {
    return res.status(400).json({ error: "Invalid baseWorkorder" });
  }
  const vbsPath = path.join(__dirname, "globalcert.vbs");
  // Always use 32-bit cscript.exe for ODBC compatibility
  const cscript32 = process.env.SYSTEMROOT
    ? path.join(process.env.SYSTEMROOT, "SysWOW64", "cscript.exe")
    : "C:/Windows/SysWOW64/cscript.exe";
  execFile(
    cscript32,
    ["//Nologo", vbsPath, baseWorkorder],
    { windowsHide: true },
    (err, stdout, stderr) => {
      console.log("globalcert VBS stderr:", stderr);
      console.log("globalcert VBS stdout:", stdout);
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
