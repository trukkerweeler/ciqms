const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();
const { spawn } = require("child_process");

// ==================================================
// Get top 5 customers by invoice count (last 365 days)
router.get("/", (req, res) => {
  const debug = process.env.DEBUG_TOPFIVE === "1";
  if (debug) console.debug("[topfive.js] /topfive route called (debug)");

  const vbsFilePath = path.join(__dirname, "topfive.vbs");
  const cscriptPath = process.env.SYSTEMROOT
    ? path.join(process.env.SYSTEMROOT, "SysWOW64", "cscript.exe")
    : "cscript.exe";

  // Use spawn to avoid buffer limits
  const child = spawn(cscriptPath, ["//Nologo", vbsFilePath]);

  let output = "";
  let errorOutput = "";

  child.stdout.on("data", (data) => {
    output += data.toString();
    if (debug) console.debug("[topfive.js] stdout chunk length:", data.length);
  });

  child.stderr.on("data", (data) => {
    errorOutput += data.toString();
    if (debug) console.debug("[topfive.js] stderr chunk length:", data.length);
  });

  child.on("close", (code) => {
    if (code !== 0 || errorOutput) {
      console.error(
        `[topfive.js] VBScript failed (code=${code}): ${errorOutput.trim()}`,
      );
      return res.status(500).send("Error retrieving data.");
    }

    try {
      // remove non-printable control characters
      const sanitizedOutput = output.replace(
        /[\u0000-\u001F\u007F-\u009F]/g,
        "",
      );
      const data = JSON.parse(sanitizedOutput);
      if (debug)
        console.debug(
          "[topfive.js] Parsed data length:",
          Array.isArray(data) ? data.length : 1,
        );
      return res.json(data);
    } catch (parseError) {
      console.error(
        `[topfive.js] Error parsing VBScript output: ${parseError.message}`,
      );
      if (debug) console.error("[topfive.js] Raw output:", output);
      return res.status(500).send("Error processing data.");
    }
  });

  child.on("error", (err) => {
    console.error(`[topfive.js] Error executing VBScript: ${err.message}`);
    return res.status(500).send("Error retrieving data.");
  });
});

module.exports = router;
