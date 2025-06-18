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
    const vbsFilePath = path.join(__dirname, "rmawip.vbs");
    const cscriptPath = process.env.SYSTEMROOT + "\\SysWOW64\\cscript.exe"; // Use 32-bit cscript explicitly
    const command = `"${cscriptPath}" //Nologo "${vbsFilePath}" ${rmaNo}`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing VBScript: ${error.message}`);
            return res.status(500).send("Error retrieving data.");
        }
        if (stderr) {
            console.error(`VBScript stderr: ${stderr}`);
            return res.status(500).send("Error retrieving data.");
        }

        try {
            // console.log("VBScript stdout:", stdout);
            const sanitizedOutput = stdout.replace(/[\u0000-\u001F\u007F-\u009F]/g, ""); // Remove control characters
            const data = JSON.parse(sanitizedOutput);
            // console.log("Parsed data:", data); // Log the parsed data for debugging
            res.json(data);
        } catch (parseError) {
            console.error(`Error parsing VBScript output: ${parseError.message}`);
            res.status(500).send("Error processing data.");
        }
    });
});

module.exports = router;
