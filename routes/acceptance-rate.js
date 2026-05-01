const express = require("express");
const { spawn } = require("child_process");
const path = require("path");
const mysql = require("mysql2");
const router = express.Router();

const DEBUG = process.env.DEBUG_ACCEPTANCE_RATE === "true";

function debugLog(...args) {
  if (DEBUG) {
    console.log("[acceptance-rate]", ...args);
  }
}

// GET /acceptance-rate
// Query parameters: ?type=vpp or ?type=fin (default: vpp)
router.get("/", (req, res) => {
  const reportType = (req.query.type || "vpp").toLowerCase();

  if (!["vpp", "fin"].includes(reportType)) {
    return res.status(400).json({
      error: "Invalid report type",
      details: "type must be 'vpp' or 'fin'",
    });
  }

  // Get previous calendar year
  const now = new Date();
  const prevYear = now.getFullYear() - 1;
  const yearStart = `${prevYear}-01-01`;
  const yearEnd = `${prevYear}-12-31`;

  debugLog(`Report type: ${reportType}`);

  // For VPP: receipts from PO_HISTORY
  // For FIN: receipts from different table (pending user identification)

  if (reportType === "vpp") {
    // VPP: Use PO_HISTORY from global database via VBScript
    fetchVPPReceipts(yearStart, yearEnd, (err, receiptData) => {
      if (err) {
        return res.status(500).json({
          error: "Failed to retrieve receipt data",
          details: err.message || err,
        });
      }
      queryAndMergeNCMData(
        reportType,
        receiptData,
        yearStart,
        yearEnd,
        prevYear,
        res,
      );
    });
  } else {
    // FIN: Use different table (placeholder for now)
    fetchFINReceipts(yearStart, yearEnd, (err, receiptData) => {
      if (err) {
        return res.status(500).json({
          error: "Failed to retrieve receipt data for FIN report",
          details: err.message || err,
        });
      }
      queryAndMergeNCMData(
        reportType,
        receiptData,
        yearStart,
        yearEnd,
        prevYear,
        res,
      );
    });
  }
});

// Helper function: Fetch VPP receipt data from PO_HISTORY via VBScript
function fetchVPPReceipts(yearStart, yearEnd, callback) {
  const vbsPath = path.join(__dirname, "acceptance-rate.vbs");
  const cscriptPath = process.env.SYSTEMROOT
    ? path.join(process.env.SYSTEMROOT, "SysWOW64", "cscript.exe")
    : "C:/Windows/SysWOW64/cscript.exe";

  const child = spawn(cscriptPath, ["//Nologo", vbsPath], {
    windowsHide: true,
  });

  let vbsOutput = "";
  let vbsError = "";

  child.stdout.on("data", (data) => {
    vbsOutput += data.toString();
  });

  child.stderr.on("data", (data) => {
    vbsError += data.toString();
  });

  child.on("close", (code) => {
    debugLog(`VBScript exit code: ${code}`);
    debugLog(`VBScript stdout length: ${vbsOutput.length}`);
    if (vbsError) debugLog(`VBScript stderr: ${vbsError}`);

    try {
      const sanitized = vbsOutput.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
      debugLog(
        `Sanitized output (first 200 chars): ${sanitized.substring(0, 200)}`,
      );
      const receiptData = JSON.parse(sanitized);

      if (receiptData.error) {
        return callback(new Error(receiptData.error));
      }

      debugLog("Parsed receipt data:", receiptData);
      callback(null, receiptData);
    } catch (err) {
      callback(new Error("Invalid VBScript output format: " + err.message));
    }
  });

  child.on("error", (err) => {
    callback(err);
  });
}

// Helper function: Fetch FIN receipt data from JOB_HEADER via VBScript
function fetchFINReceipts(yearStart, yearEnd, callback) {
  const vbsPath = path.join(__dirname, "acceptance-rate-fin.vbs");
  const cscriptPath = process.env.SYSTEMROOT
    ? path.join(process.env.SYSTEMROOT, "SysWOW64", "cscript.exe")
    : "C:/Windows/SysWOW64/cscript.exe";

  const child = spawn(cscriptPath, ["//Nologo", vbsPath], {
    windowsHide: true,
  });

  let vbsOutput = "";
  let vbsError = "";

  child.stdout.on("data", (data) => {
    vbsOutput += data.toString();
  });

  child.stderr.on("data", (data) => {
    vbsError += data.toString();
  });

  child.on("close", (code) => {
    debugLog(`FIN VBScript exit code: ${code}`);
    debugLog(`FIN VBScript stdout length: ${vbsOutput.length}`);
    if (vbsError) debugLog(`FIN VBScript stderr: ${vbsError}`);

    try {
      const sanitized = vbsOutput.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
      debugLog(
        `FIN Sanitized output (first 200 chars): ${sanitized.substring(0, 200)}`,
      );
      const receiptData = JSON.parse(sanitized);

      if (receiptData.error) {
        return callback(new Error(receiptData.error));
      }

      debugLog("Parsed FIN receipt data:", receiptData);
      callback(null, receiptData);
    } catch (err) {
      callback(new Error("Invalid FIN VBScript output format: " + err.message));
    }
  });

  child.on("error", (err) => {
    callback(err);
  });
}

// Helper function: Query NCM data and merge with receipt data
function queryAndMergeNCMData(
  reportType,
  receiptData,
  yearStart,
  yearEnd,
  prevYear,
  res,
) {
  const ncmType = reportType === "vpp" ? "VPP" : "FIN";
  const ncmFieldName = reportType === "vpp" ? "vppNCMs" : "finNCMs";

  const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    port: 3306,
    database: "quality",
  });

  connection.connect((err) => {
    if (err) {
      return res.status(500).json({
        error: "Database connection failed",
        details: err.message,
      });
    }
    debugLog("Database connection successful");

    // Query for NCM counts by month
    const query = `
      SELECT 
        MONTH(NCM_DATE) as month, 
        COUNT(*) as ncm_count 
      FROM NONCONFORMANCE 
      WHERE NCM_TYPE = '${ncmType}' 
        AND NCM_DATE >= '${yearStart}' 
        AND NCM_DATE <= '${yearEnd}' 
      GROUP BY MONTH(NCM_DATE) 
      ORDER BY MONTH(NCM_DATE) ASC
    `;
    debugLog("Executing NCM query for type:", ncmType);

    connection.query(query, (err, rows) => {
      connection.end();

      if (err) {
        return res.status(500).json({
          error: "Query failed",
          details: err.message,
        });
      }
      debugLog(`NCM query returned ${rows ? rows.length : 0} rows`);

      // Build NCM data map by month
      const ncmData = {};
      rows.forEach((row) => {
        ncmData[row.month] = row.ncm_count;
      });
      debugLog("NCM data map:", ncmData);

      // Merge receipt and NCM data, calculate acceptance rates
      const chartData = receiptData.map((receipt) => {
        const month = receipt.month;
        const receipts = receipt.receipts;
        const ncms = ncmData[month] || 0;

        // Acceptance rate = (receipts - ncms) / receipts * 100
        // If no receipts, set rate to 100 (no data)
        let acceptanceRate = 100;
        if (receipts > 0) {
          acceptanceRate = ((receipts - ncms) / receipts) * 100;
        }

        const row = {
          month: month,
          monthName: getMonthName(month),
          receipts: receipts,
          [ncmFieldName]: ncms,
          acceptanceRate: Math.round(acceptanceRate * 100) / 100,
        };

        return row;
      });
      debugLog("Final chart data:", chartData);

      res.json({
        year: prevYear,
        reportType: reportType,
        data: chartData,
      });
    });
  });
}

// Helper function to get month name
function getMonthName(monthNum) {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return months[monthNum - 1] || "";
}

module.exports = router;
