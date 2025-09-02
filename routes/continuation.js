const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();
const mysql = require("mysql2");
const { exec } = require("child_process");
const { spawn } = require("child_process");

// ==================================================
// Get record
router.get("/", (req, res) => {
    // console.log("Received request for AP_OPEN_ITEMS");
    const vbsFilePath = path.join(__dirname, "continuation.vbs");
    const cscriptPath = process.env.SYSTEMROOT + "\\SysWOW64\\cscript.exe"; // Use 32-bit cscript explicitly
    const command = `"${cscriptPath}" //Nologo "${vbsFilePath}" `;

    // Use spawn to avoid buffer limits
    const child = spawn(cscriptPath, ["//Nologo", vbsFilePath]);

    let output = "";
    let errorOutput = "";

    child.stdout.on("data", (data) => {
        output += data.toString();
    });

    child.stderr.on("data", (data) => {
        errorOutput += data.toString();
    });

    child.on("close", (code) => {
        if (code !== 0 || errorOutput) {
            console.error(`VBScript stderr: ${errorOutput}`);
            return res.status(500).send("Error retrieving data.");
        }
        try {
            const sanitizedOutput = output.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
            const data = JSON.parse(sanitizedOutput);
            res.json(data);
        } catch (parseError) {
            console.error(`Error parsing VBScript output: ${parseError.message}`);
            res.status(500).send("Error processing data.");
        }
    });

    child.on("error", (err) => {
        console.error(`Error executing VBScript: ${err.message}`);
        res.status(500).send("Error retrieving data.");
    });
});

module.exports = router;
