// routes/cert-chem.js - Express route for chemical treatment process
const express = require("express");
const { execFile } = require("child_process");
const path = require("path");
const router = express.Router();

router.get("/", (req, res) => {
  const baseWorkorder = req.query.baseWorkorder;
  if (!/^\d{6}$/.test(baseWorkorder)) {
    return res.status(400).json({ error: "Invalid baseWorkorder" });
  }
  const vbsPath = path.join(__dirname, "cert-chem.vbs");
  const cscript32 = process.env.SYSTEMROOT
    ? path.join(process.env.SYSTEMROOT, "SysWOW64", "cscript.exe")
    : "C:/Windows/SysWOW64/cscript.exe";
  execFile(
    cscript32,
    ["//Nologo", vbsPath, baseWorkorder],
    { windowsHide: true },
    (err, stdout, stderr) => {
      if (err) {
        return res
          .status(500)
          .json({ error: "VBS execution failed", details: stderr });
      }
      try {
        const data = JSON.parse(stdout);
        res.json(data);
      } catch (e) {
        res
          .status(500)
          .json({
            error: "Failed to parse VBS output",
            raw: stdout,
            stderr: stderr,
          });
      }
    },
  );
});

module.exports = router;
