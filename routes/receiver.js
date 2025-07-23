const express = require("express");
const path = require("path");
const router = express.Router();
const { exec } = require("child_process");


router.get("/", async (req, res) => {
    const { job, suffix, rtr_seq } = req.query;

    if (!job || !suffix || !rtr_seq) {
        return res.status(400).json({ error: "Missing required query parameters." });
    }
    // Validate job, suffix, and rtr_seq to ensure they are safe to use in a command
    const validJob = /^[a-zA-Z0-9_\-]+$/.test(job);
    const validSuffix = /^[a-zA-Z0-9_\-]+$/.test(suffix);
    const validRtrSeq = /^[a-zA-Z0-9_\-]+$/.test(rtr_seq);
    if (!validJob || !validSuffix || !validRtrSeq) {
        return res.status(400).json({ error: "Invalid query parameters." });
    }

    const vbsFilePath = path.join(__dirname, "receiver.vbs");
    const cscriptPath = process.env.SYSTEMROOT + "\\SysWOW64\\cscript.exe";
    const command = `"${cscriptPath}" //Nologo "${vbsFilePath}" "${job}" "${suffix}" "${rtr_seq}"`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing VBScript: ${error.message}`);
            return res.status(500).send("Error retrieving data.");
        }
        if (stderr) {
            console.error(`VBScript stderr: ${stderr}`);
            return res.status(500).send("Error retrieving data.");
        }
        // Log the raw output for debugging
        // console.log("Raw VBScript output35:", stdout);
        try {
            const sanitizedOutput = stdout.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
            let data;
            try {
                data = JSON.parse(sanitizedOutput);
            } catch (jsonError) {
                console.error(`Sanitized output is not valid JSON41: ${jsonError.message}`);
                return res.status(500).send("Error processing data: Invalid JSON format.");
            }
            res.json(data);
        } catch (parseError) {
            console.error(`Error parsing VBScript output: ${parseError.message}`);
            console.error("Output was:", stdout);
            res.status(500).send("Error processing data.");
        }
    });
});

module.exports = router;