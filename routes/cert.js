// cert.js



const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();
const mysql = require("mysql2");
const { exec } = require("child_process");


router.get("/detail/:id", (req, res) => {
    // console.log("Received request 43 for WO No:", req.params.id);
    const longWO = req.params.id;
    // return res.status(501).send("Not implemented yet.");
    const vbsFilePath = path.join(__dirname, "certdetail.vbs");
    const cscriptPath = process.env.SYSTEMROOT + "\\SysWOW64\\cscript.exe"; // Use 32-bit cscript explicitly
    const command = `"${cscriptPath}" //Nologo "${vbsFilePath}" ${longWO}`;

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
            // console.log("Raw VBScript output:", stdout); // Log the raw output for debugging
            const sanitizedOutput = stdout.replace(/[\u0000-\u001F\u007F-\u009F]/g, ""); // Remove control characters
            // console.log("Sanitized output:", sanitizedOutput); // Log the sanitized output for debugging
            const data = JSON.parse(sanitizedOutput);
            // console.log("Parsed data:", data); // Log the parsed data for debugging
            res.json(data);
        } catch (parseError) {
            console.error(`Error parsing VBScript output: ${parseError.message}`);
            res.status(500).send("Error processing data.");
        }
    });
});


// ==================================================
// Get record
router.get("/:id", (req, res) => {
    console.log("Received request for WO No:", req.params.id);
    const rmaNo = req.params.id;
    const vbsFilePath = path.join(__dirname, "cert.vbs");
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
            // console.log("Raw VBScript output:", stdout); // Log the raw output for debugging
            const sanitizedOutput = stdout.replace(/[\u0000-\u001F\u007F-\u009F]/g, ""); // Remove control characters
            // console.log("Sanitized output:", sanitizedOutput); // Log the sanitized output for debugging
            const data = JSON.parse(sanitizedOutput);
            // console.log("Parsed data:", data); // Log the parsed data for debugging
            res.json(data);
        } catch (parseError) {
            console.error(`Error parsing VBScript output: ${parseError.message}`);
            res.status(500).send("Error processing data.");
        }
    });
});

// ==================================================
router.get("/processes/:id", (req, res) => {
    // console.log("Received request 78 for WO No:", req.params.id);
    const longWO = req.params.id;
    const vbsFilePath = path.join(__dirname, "certprocesses.vbs");
    const cscriptPath = process.env.SYSTEMROOT + "\\SysWOW64\\cscript.exe"; // Use 32-bit cscript explicitly
    const command = `"${cscriptPath}" //Nologo "${vbsFilePath}" ${longWO}`;

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
            // console.log("Raw VBScript output:", stdout); // Log the raw output for debugging
            const sanitizedOutput = stdout.replace(/[\u0000-\u001F\u007F-\u009F]/g, ""); // Remove control characters
            // console.log("Sanitized output:", sanitizedOutput); // Log the sanitized output for debugging
            const data = JSON.parse(sanitizedOutput);
            // console.log("Parsed data:", data); // Log the parsed data for debugging
            res.json(data);
        } catch (parseError) {
            console.error(`Error parsing VBScript output: ${parseError.message}`);
            res.status(500).send("Error processing data.");
        }
    });
});




    // =================================================
    router.get("/certpurchase/:id", (req, res) => {
    // console.log("Received request 114 for WO No:", req.params.id);
    const longWO = req.params.id;
    const jobId = longWO.substring(0, 6);
    const jobSuffix = longWO.substring(7, 10);
    const jobOp = longWO.substring(11, 17);
    // console.log(`Job ID: ${jobId}, Job Suffix: ${jobSuffix}, Job Op: ${jobOp}`);

    const vbsFilePath = path.join(__dirname, "certpurchase.vbs");
    const cscriptPath = process.env.SYSTEMROOT + "\\SysWOW64\\cscript.exe"; // Use 32-bit cscript explicitly
    const command = `"${cscriptPath}" //Nologo "${vbsFilePath}" ${longWO}`;

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
            // console.log("Raw VBScript output:", stdout); // Log the raw output for debugging
            const sanitizedOutput = stdout.replace(/[\u0000-\u001F\u007F-\u009F]/g, ""); // Remove control characters
            // console.log("Sanitized output:", sanitizedOutput); // Log the sanitized output for debugging
            const data = JSON.parse(sanitizedOutput);
            // console.log("Parsed data:", data); // Log the parsed data for debugging
            res.json(data);
        } catch (parseError) {
            console.error(`Error parsing VBScript output: ${parseError.message}`);
            res.status(500).send("Error processing data.");
        }
    });
});

// ==================================================
router.get("/fwld/:id", (req, res) => {
    // console.log("Received request 150 for WO No:", req.params.id);
    const longWO = req.params.id;
    const jobId = longWO.substring(0, 6);
    const jobSuffix = longWO.substring(7, 10);
    const jobOp = longWO.substring(11, 17);
    // console.log(`Job ID: ${jobId}, Job Suffix: ${jobSuffix}, Job Op: ${jobOp}`);

    const vbsFilePath = path.join(__dirname, "certfwld.vbs");
    const cscriptPath = process.env.SYSTEMROOT + "\\SysWOW64\\cscript.exe"; // Use 32-bit cscript explicitly
    const command = `"${cscriptPath}" //Nologo "${vbsFilePath}" ${longWO}`;

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
            // console.log("Raw VBScript output:", stdout); // Log the raw output for debugging
            const sanitizedOutput = stdout.replace(/[\u0000-\u001F\u007F-\u009F]/g, ""); // Remove control characters
            // console.log("Sanitized output:", sanitizedOutput); // Log the sanitized output for debugging
            const data = JSON.parse(sanitizedOutput);
            // console.log("Parsed data:", data); // Log the parsed data for debugging
            res.json(data);
        } catch (parseError) {
            console.error(`Error parsing VBScript output: ${parseError.message}`);
            res.status(500).send("Error processing data.");
        }
    });
});

// ==================================================
router.get("/swld/:id", (req, res) => {
    // console.log("Received request 150 for WO No:", req.params.id);
    const longWO = req.params.id;
    const jobId = longWO.substring(0, 6);
    const jobSuffix = longWO.substring(7, 10);
    const jobOp = longWO.substring(11, 17);
    // console.log(`Job ID: ${jobId}, Job Suffix: ${jobSuffix}, Job Op: ${jobOp}`);

    const vbsFilePath = path.join(__dirname, "certswld.vbs");
    const cscriptPath = process.env.SYSTEMROOT + "\\SysWOW64\\cscript.exe"; // Use 32-bit cscript explicitly
    const command = `"${cscriptPath}" //Nologo "${vbsFilePath}" ${longWO}`;

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
            // console.log("Raw VBScript output:", stdout); // Log the raw output for debugging
            const sanitizedOutput = stdout.replace(/[\u0000-\u001F\u007F-\u009F]/g, ""); // Remove control characters
            // console.log("Sanitized output:", sanitizedOutput); // Log the sanitized output for debugging
            const data = JSON.parse(sanitizedOutput);
            // console.log("Parsed data:", data); // Log the parsed data for debugging
            res.json(data);
        } catch (parseError) {
            console.error(`Error parsing VBScript output: ${parseError.message}`);
            res.status(500).send("Error processing data.");
        }
    });
});

// ==================================================
router.get("/heat/:id", (req, res) => {
    // console.log("Received request 225 for WO No:", req.params.id);
    const longWO = req.params.id;
    const jobId = longWO.substring(0, 6);
    const jobSuffix = longWO.substring(7, 10);
    const jobOp = longWO.substring(11, 17);
    // console.log(`(231) Job ID: ${jobId}, Job Suffix: ${jobSuffix}, Job Op: ${jobOp}`);

    const vbsFilePath = path.join(__dirname, "certheat.vbs");
    const cscriptPath = process.env.SYSTEMROOT + "\\SysWOW64\\cscript.exe"; // Use 32-bit cscript explicitly
    const command = `"${cscriptPath}" //Nologo "${vbsFilePath}" ${longWO}`;

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
            // console.log("Raw VBScript output:", stdout); // Log the raw output for debugging
            const sanitizedOutput = stdout.replace(/[\u0000-\u001F\u007F-\u009F]/g, ""); // Remove control characters
            // console.log("Sanitized output:", sanitizedOutput); // Log the sanitized output for debugging
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
