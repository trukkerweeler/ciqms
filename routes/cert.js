// cert.js

const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();
const mysql = require("mysql2");
const { exec } = require("child_process");

// Helper function to safely parse VBScript JSON output
function parseVBScriptOutput(stdout, routeName = "VBScript") {
  try {
    // Remove control characters and BOM
    let sanitized = stdout.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
    sanitized = sanitized.replace(/^\uFEFF/, "");
    sanitized = sanitized.trim();

    // If empty, return empty array (legitimate case - no data for this section)
    if (!sanitized) {
      console.log(`${routeName} returned no data (empty output)`);
      return [];
    }

    return JSON.parse(sanitized);
  } catch (error) {
    console.error(`Error parsing ${routeName} output: ${error.message}`);
    console.error(`Raw stdout (first 200 chars): ${stdout.substring(0, 200)}`);
    throw error;
  }
}

router.get("/detail/:id", (req, res) => {
  console.log("[DETAIL REQUEST] Received request for ID:", req.params.id);
  const longWO = req.params.id;
  // return res.status(501).send("Not implemented yet.");
  const vbsFilePath = path.join(__dirname, "certdetail.vbs");
  const cscriptPath = process.env.SYSTEMROOT + "\\SysWOW64\\cscript.exe"; // Use 32-bit cscript explicitly
  const command = `"${cscriptPath}" //Nologo "${vbsFilePath}" ${longWO}`;
  console.log("[DETAIL VBScript] Executing command:", command);

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(
        `[DETAIL ERROR] Error executing VBScript: ${error.message}`
      );
      return res.status(500).send("Error retrieving data.");
    }
    if (stderr) {
      console.error(`VBScript stderr: ${stderr}`);
      return res.status(500).send("Error retrieving data.");
    }

    try {
      // Remove control characters and BOM
      let sanitizedOutput = stdout.replace(/[\u0000-\u001F\u007F-\u009F]/g, ""); // Remove control characters
      sanitizedOutput = sanitizedOutput.replace(/^\uFEFF/, ""); // Remove BOM if present
      sanitizedOutput = sanitizedOutput.trim(); // Trim whitespace

      if (!sanitizedOutput) {
        console.error("Detail VBScript returned empty output");
        return res
          .status(500)
          .json({ error: "No data returned from VBScript" });
      }

      const data = JSON.parse(sanitizedOutput);
      res.json(data);
    } catch (parseError) {
      console.error(
        `Error parsing detail VBScript output: ${parseError.message}`
      );
      console.error(`Raw stdout start: ${stdout.substring(0, 100)}`);
      res.status(500).json({ error: parseError.message });
    }
  });
});

// ==================================================
// Get record
router.get("/:id", (req, res) => {
  console.log("[MAIN CERT REQUEST] Received request for WO No:", req.params.id);
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
      // Remove control characters and BOM
      let sanitizedOutput = stdout.replace(/[\u0000-\u001F\u007F-\u009F]/g, ""); // Remove control characters
      sanitizedOutput = sanitizedOutput.replace(/^\uFEFF/, ""); // Remove BOM if present
      sanitizedOutput = sanitizedOutput.trim(); // Trim whitespace

      if (!sanitizedOutput) {
        console.error("Main cert VBScript returned empty output");
        return res
          .status(500)
          .json({ error: "No data returned from VBScript" });
      }

      const data = JSON.parse(sanitizedOutput);
      res.json(data);
    } catch (parseError) {
      console.error(
        `Error parsing main cert VBScript output: ${parseError.message}`
      );
      console.error(`Raw stdout start: ${stdout.substring(0, 100)}`);
      res.status(500).json({ error: parseError.message });
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
      const data = parseVBScriptOutput(stdout, "certprocesses.vbs");
      res.json(data);
    } catch (parseError) {
      res.status(500).json({ error: parseError.message });
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
      const data = parseVBScriptOutput(stdout, "certfwld.vbs");
      res.json(data);
    } catch (parseError) {
      res.status(500).json({ error: parseError.message });
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
      const sanitizedOutput = stdout.replace(
        /[\u0000-\u001F\u007F-\u009F]/g,
        ""
      ); // Remove control characters
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
      const data = parseVBScriptOutput(stdout, "certheat.vbs");
      res.json(data);
    } catch (parseError) {
      res.status(500).json({ error: parseError.message });
    }
  });
});

// ==================================================
// Save revision log (edit)
router.post("/revision/edit", (req, res) => {
  console.log(
    "[REVISION/EDIT REQUEST] Received edit request with body:",
    req.body
  );
  const { woNo, section, serialNumber, originalData, notes } = req.body;
  const userName = req.headers["x-user"] || "SYSTEM";

  const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    port: 3306,
    database: "quality",
  });

  connection.connect((err) => {
    if (err) {
      console.error("Database connection error:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    const query =
      "INSERT INTO CERT_REVISION (WO_NO, SECTION, SERIAL_NUMBER, REVISION_TYPE, ORIGINAL_DATA, NOTES, CREATE_BY) VALUES (?, ?, ?, 'EDIT', ?, ?, ?)";
    const values = [
      woNo,
      section,
      serialNumber || null,
      JSON.stringify(originalData),
      notes,
      userName,
    ];
    console.log("[CERT_REVISION EDIT] SQL:", query);
    console.log("[CERT_REVISION EDIT] Values:", values);
    connection.query(query, values, (err, results) => {
      connection.end();
      if (err) {
        console.error("Error inserting revision record:", err);
        return res.status(500).json({ error: "Failed to save revision" });
      }
      res.json({ success: true, revisionId: results.insertId });
    });
  });
});

// ==================================================
// Save revision log (delete)
router.post("/revision/delete", (req, res) => {
  console.log(
    "[REVISION/DELETE REQUEST] Received delete request with body:",
    req.body
  );
  const { woNo, section, serialNumber, originalData, notes } = req.body;
  const userName = req.headers["x-user"] || "SYSTEM";

  const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    port: 3306,
    database: "quality",
  });

  connection.connect((err) => {
    if (err) {
      console.error("Database connection error:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    const query =
      "INSERT INTO CERT_REVISION (WO_NO, SECTION, SERIAL_NUMBER, REVISION_TYPE, ORIGINAL_DATA, NOTES, CREATE_BY) VALUES (?, ?, ?, 'DELETE', ?, ?, ?)";
    const values = [
      woNo,
      section,
      serialNumber || null,
      JSON.stringify(originalData),
      notes,
      userName,
    ];
    console.log("[CERT_REVISION DELETE] SQL:", query);
    console.log("[CERT_REVISION DELETE] Values:", values);
    connection.query(query, values, (err, results) => {
      connection.end();
      if (err) {
        console.error("Error inserting revision record:", err);
        return res.status(500).json({ error: "Failed to save revision" });
      }
      res.json({ success: true, revisionId: results.insertId });
    });
  });
});

// ==================================================
// Add new row to CERT_ADD table
router.post("/add", (req, res) => {
  console.log("[CERT/ADD REQUEST] Received add request with body:", req.body);
  const { woNo, section, rowData } = req.body;
  const userName = req.headers["x-user"] || "SYSTEM";

  if (!woNo || !section || !rowData) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    port: 3306,
    database: "quality",
  });

  connection.connect((err) => {
    if (err) {
      console.error("Database connection error:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    const query =
      "INSERT INTO CERT_ADD (WO_NO, SECTION, ROW_DATA, CREATE_BY) VALUES (?, ?, ?, ?)";
    const values = [woNo, section, JSON.stringify(rowData), userName];
    console.log("[CERT_ADD] SQL:", query);
    console.log("[CERT_ADD] Values:", values);
    connection.query(query, values, (err, results) => {
      connection.end();
      if (err) {
        console.error("Error inserting CERT_ADD record:", err);
        return res.status(500).json({ error: "Failed to save new row" });
      }
      res.json({
        success: true,
        certAddId: results.insertId,
        source: "mysql",
      });
    });
  });
});

// ==================================================
// Get customer addresses by customer code
router.get("/customer-addresses/:customerCode", (req, res) => {
  const customerCode = req.params.customerCode.trim();
  console.log(
    "[CUSTOMER_ADDRESSES REQUEST] Received request for customer code:",
    customerCode
  );

  const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    port: 3306,
    database: "global",
  });

  const query = `
    SELECT CUSTOMER, REC, NAME_CUSTOMER, ADDRESS1, ADDRESS2, CITY, STATE, ZIP, COUNTRY
    FROM CUSTOMER_MASTER
    WHERE CUSTOMER = ?
    ORDER BY REC ASC
  `;
  const values = [customerCode];
  console.log("[CUSTOMER_ADDRESSES] SQL:", query);
  console.log("[CUSTOMER_ADDRESSES] Values:", values);

  connection.query(query, values, (err, results) => {
    connection.end();

    if (err) {
      console.error("Error fetching customer addresses:", err);
      return res
        .status(500)
        .json({ error: "Failed to fetch customer addresses" });
    }

    // Filter for records with valid US states
    const validUSStates = [
      "AL",
      "AK",
      "AZ",
      "AR",
      "CA",
      "CO",
      "CT",
      "DE",
      "FL",
      "GA",
      "HI",
      "ID",
      "IL",
      "IN",
      "IA",
      "KS",
      "KY",
      "LA",
      "ME",
      "MD",
      "MA",
      "MI",
      "MN",
      "MS",
      "MO",
      "MT",
      "NE",
      "NV",
      "NH",
      "NJ",
      "NM",
      "NY",
      "NC",
      "ND",
      "OH",
      "OK",
      "OR",
      "PA",
      "RI",
      "SC",
      "SD",
      "TN",
      "TX",
      "UT",
      "VT",
      "VA",
      "WA",
      "WV",
      "WI",
      "WY",
    ];

    const filteredResults = results.filter((record) => {
      const state = record.STATE ? record.STATE.trim().toUpperCase() : "";
      const hasAddress = record.ADDRESS1 && record.ADDRESS1.trim();
      const hasValidState = validUSStates.includes(state);
      return hasAddress && hasValidState;
    });

    res.json(filteredResults);
  });
});

// ==================================================
// Recursive item history query endpoint
router.get("/item-history/:woNumber", (req, res) => {
  const woNumber = req.params.woNumber;
  console.log(
    "[ITEM_HISTORY REQUEST] Received request for WO Number:",
    woNumber
  );
  const vbsFilePath = path.join(__dirname, "itemhistory.vbs");
  const cscriptPath = process.env.SYSTEMROOT + "\\SysWOW64\\cscript.exe";
  const command = `"${cscriptPath}" //Nologo "${vbsFilePath}" ${woNumber}`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing VBScript: ${error.message}`);
      return res.status(500).json({ error: "Error retrieving data" });
    }
    if (stderr) {
      console.error(`VBScript stderr: ${stderr}`);
      return res.status(500).json({ error: stderr });
    }

    try {
      let sanitizedOutput = stdout.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
      sanitizedOutput = sanitizedOutput.replace(/^\uFEFF/, "");
      sanitizedOutput = sanitizedOutput.trim();

      if (!sanitizedOutput) {
        console.log("Item history VBScript returned no data");
        return res.json([]);
      }

      const data = JSON.parse(sanitizedOutput);

      // Log sample OPERATION field values to terminal - COMMENTED OUT
      // console.log(`\n=== Item History for WO ${woNumber} ===`);
      // console.log(`Total records: ${data.length}`);
      // console.log(`\nSample OPERATION values (first 10 records):`);
      // data.slice(0, 10).forEach((record, idx) => {
      //   console.log(
      //     `  [${idx}] JOB: ${record.JOB}, OPERATION: "${record.OPERATION}", SEQUENCE: "${record.SEQUENCE}"`
      //   );
      // });
      // console.log(`\n`);

      res.json(data);
    } catch (parseError) {
      console.error(
        `Error parsing item history VBScript output: ${parseError.message}`
      );
      console.error(`Raw stdout start: ${stdout.substring(0, 100)}`);
      res.status(500).json({ error: parseError.message });
    }
  });
});

module.exports = router;
