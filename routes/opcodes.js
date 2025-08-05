const express = require("express");
const path = require("path");
const router = express.Router();
const { spawn } = require("child_process");

// ==================================================
// Get record
router.get("/", (_req, res) => {
    // console.log("Received request for OP_CODES");
    const vbsFilePath = path.join(__dirname, "opcodes.vbs");
    const cscriptPath = process.env.SYSTEMROOT + "\\SysWOW64\\cscript.exe"; // Use 32-bit cscript explicitly

    // Use spawn to avoid buffer limits
    let output = "";
    let errorOutput = "";
    const child = spawn(cscriptPath, ["//Nologo", vbsFilePath]);

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
            // console.log(`Sanitized VBScript output: ${sanitizedOutput}`);
            const data = JSON.parse(sanitizedOutput);
            // console.log(`VBScript output: ${output}`);
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
