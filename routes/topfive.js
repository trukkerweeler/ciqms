const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();
const { spawn } = require("child_process");

// ==================================================
// Get top 5 customers by invoice count (last 365 days)
router.get("/", (req, res) => {
  console.log("[topfive.js] /topfive route called");
  const vbsFilePath = path.join(__dirname, "topfive.vbs");
  console.log("[topfive.js] VBS file path:", vbsFilePath);
  console.log("[topfive.js] VBS file exists:", fs.existsSync(vbsFilePath));
  const cscriptPath = process.env.SYSTEMROOT + "\\SysWOW64\\cscript.exe";
  console.log("[topfive.js] cscript path:", cscriptPath);

  // Use spawn to avoid buffer limits
  const child = spawn(cscriptPath, ["//Nologo", vbsFilePath]);

  let output = "";
  let errorOutput = "";

  child.stdout.on("data", (data) => {
    console.log("[topfive.js] stdout chunk:", data.toString());
    output += data.toString();
  });

  child.stderr.on("data", (data) => {
    console.log("[topfive.js] stderr chunk:", data.toString());
    errorOutput += data.toString();
  });

  child.on("close", (code) => {
    console.log("[topfive.js] VBScript closed with code:", code);
    console.log("[topfive.js] stderr output:", errorOutput);
    console.log("[topfive.js] stdout output length:", output.length);
    console.log("[topfive.js] stdout output:", output);

    if (code !== 0 || errorOutput) {
      console.error(`[topfive.js] VBScript error: ${errorOutput}`);
      return res.status(500).send("Error retrieving data.");
    }
    try {
      const sanitizedOutput = output.replace(
        /[\u0000-\u001F\u007F-\u009F]/g,
        "",
      );
      console.log("[topfive.js] Sanitized output:", sanitizedOutput);
      const data = JSON.parse(sanitizedOutput);
      console.log("[topfive.js] Parsed data:", data);
      res.json(data);
    } catch (parseError) {
      console.error(
        `[topfive.js] Error parsing VBScript output: ${parseError.message}`,
      );
      console.error(`[topfive.js] Raw output: ${output}`);
      res.status(500).send("Error processing data.");
    }
  });

  child.on("error", (err) => {
    console.error(`[topfive.js] Error executing VBScript: ${err.message}`);
    res.status(500).send("Error retrieving data.");
  });
});

module.exports = router;
