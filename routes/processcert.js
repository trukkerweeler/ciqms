// routes/processcert.js - Express route for processcert
const express = require("express");
const { execFile } = require("child_process");
const path = require("path");
const router = express.Router();

// GET /processcert/processcert-coc?job=122166&selectedIndices=0,1,3
// Steps 1-3: Fetch J52 transactions (downstream completions), accept selected indices, build chain-of-custody links
// ITEM_HISTORY-based (not INVENTORY_HIST) to ensure SERIAL_NUMBER is available
// Process-centric: operations, router descriptions, outside processing flags, and PO references
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

  // Build command arguments: job, optional selectedIndices
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

module.exports = router;
