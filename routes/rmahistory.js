const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();
const mysql = require("mysql2");
const { exec } = require("child_process");

// ==================================================
// Get record
router.get("/:id", (req, res) => {
  // console.log("Received request for RMA No:", req.params.id);
  const rmaNo = req.params.id;
  const vbsFilePath = path.join(__dirname, "rmahistory.vbs");
  const cscriptPath = process.env.SYSTEMROOT + "\\SysWOW64\\cscript.exe"; // Use 32-bit cscript explicitly
  const command = `"${cscriptPath}" //Nologo "${vbsFilePath}" ${rmaNo}`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing VBScript: ${error.message}`);
      console.error(`stderr: ${stderr}`);
      console.error(`stdout: ${stdout}`);
      return res.status(500).send("Error retrieving data.");
    }

    // Log stderr for debugging but don't treat it as a fatal error
    if (stderr) {
      console.log(`VBScript stderr (debug output):\n${stderr}`);
    }

    try {
      const sanitizedOutput = stdout.replace(
        /[\u0000-\u001F\u007F-\u009F]/g,
        "",
      ); // Remove control characters
      const data = JSON.parse(sanitizedOutput);
      res.json(data);
    } catch (parseError) {
      console.error(`Error parsing VBScript output: ${parseError.message}`);
      console.error(`Attempted to parse: "${stdout}"`);
      res.status(500).send("Error processing data.");
    }
  });
});

module.exports = router;
