// cert-global.js
// Direct AWS database queries for global certifications (no VBScript dependencies)

const express = require("express");
const router = express.Router();
const mysql = require("mysql2");

// Helper function to create AWS database connection
function createAWSConnection() {
  return mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    port: 3306,
    database: "global",
  });
}

// Helper function to create quality database connection
function createQualityConnection() {
  return mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    port: 3306,
    database: "quality",
  });
}

// Middleware to handle work order number formatting
router.use((req, res, next) => {
  if (req.params.woNumber) {
    req.params.woNumber = req.params.woNumber.padStart(15, "0");
  }
  next();
});

// ==================================================
// Get main certification data for a work order
router.get("/:id", (req, res) => {
  const woNumber = req.params.id;
  console.log("[CERT-GLOBAL] Received request for WO:", woNumber);

  const connection = createAWSConnection();

  // Extract components from work order number
  const jobId = woNumber.substring(0, 6);
  const jobSuffix = woNumber.substring(7, 10);
  const jobOp = woNumber.substring(11, 17);

  console.log(
    `[CERT-GLOBAL] Parsed: jobId=${jobId}, jobSuffix=${jobSuffix}, jobOp=${jobOp}`,
  );

  const query = `
    SELECT 
      J.JOB,
      J.SUFFIX,
      J.CUSTOMER,
      C.NAME_CUSTOMER,
      C.ADDRESS1,
      C.CITY,
      C.STATE
    FROM JOB_HEADER AS J
    LEFT JOIN CUSTOMER_MASTER AS C ON J.CUSTOMER = C.CUSTOMER AND C.REC = 1
    WHERE J.JOB = ? AND J.SUFFIX = ?
    LIMIT 1
  `;

  console.log(`[CERT-GLOBAL] SQL: ${query}`);
  console.log(`[CERT-GLOBAL] Params: [${jobId}, ${jobSuffix}]`);

  connection.query(query, [jobId, jobSuffix], (err, results) => {
    connection.end();

    if (err) {
      console.error("[CERT-GLOBAL] Error fetching certification data:", err);
      return res
        .status(500)
        .json({ error: "Database error", details: err.message });
    }

    console.log(`[CERT-GLOBAL] Query returned ${results.length} results`);
    res.json(results.length > 0 ? results[0] : {});
  });
});

// ==================================================
// Get item history for a work order (flat, not recursive), excluding PRODUCT_LINE = 'HW'
router.get("/item-history/:woNumber", (req, res) => {
  const woNumber = req.params.woNumber;
  const connection = createAWSConnection();
  const jobId = woNumber.replace(/^0+/, "");
  const query = `
    SELECT 
      ih.PART, ih.JOB, ih.SUFFIX, ih.SEQUENCE, ih.LOT, ih.BIN, ih.SERIAL_NUMBER, ih.REFERENCE, ih.QUANTITY, ih.PURCHASE_ORDER, ih.PO_LINE,
      inv.DESCRIPTION, inv.PRODUCT_LINE
    FROM global.ITEM_HISTORY ih
    LEFT JOIN global.INVENTORY_MSTR inv ON ih.PART = inv.PART
    WHERE ih.JOB = ? AND (inv.PRODUCT_LINE IS NULL OR inv.PRODUCT_LINE <> 'HW')
    ORDER BY ih.SEQUENCE
  `;
  connection.query(query, [jobId], (err, results) => {
    connection.end();
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(results || []);
  });
});

// ==================================================
// Get recursive item history for a work order (by JOB and SUFFIX), joined with INVENTORY_MSTR, excluding PRODUCT_LINE = 'HW'
router.get("/recursive-item-history/:jobNumber/:suffix", (req, res) => {
  const jobNumber = req.params.jobNumber;
  const suffix = req.params.suffix;
  console.log(
    "[CERT-GLOBAL] Recursive item history request for JOB/SUFFIX:",
    jobNumber,
    suffix,
  );

  const connection = createAWSConnection();

  const query = `
    WITH RECURSIVE ItemHistory AS (
      SELECT 
        ih.PART, ih.JOB, ih.SUFFIX, ih.SEQUENCE, ih.LOT, ih.BIN, ih.SERIAL_NUMBER, ih.REFERENCE, ih.QUANTITY, ih.PURCHASE_ORDER, ih.PO_LINE,
        inv.DESCRIPTION, inv.PRODUCT_LINE
      FROM global.ITEM_HISTORY ih
      LEFT JOIN global.INVENTORY_MSTR inv ON ih.PART = inv.PART
      WHERE ih.JOB = ? AND ih.SUFFIX = ? AND (inv.PRODUCT_LINE IS NULL OR inv.PRODUCT_LINE <> 'HW')
      UNION ALL
      SELECT 
        ih.PART, ih.JOB, ih.SUFFIX, ih.SEQUENCE, ih.LOT, ih.BIN, ih.SERIAL_NUMBER, ih.REFERENCE, ih.QUANTITY, ih.PURCHASE_ORDER, ih.PO_LINE,
        inv.DESCRIPTION, inv.PRODUCT_LINE
      FROM global.ITEM_HISTORY ih
      LEFT JOIN global.INVENTORY_MSTR inv ON ih.PART = inv.PART
      INNER JOIN ItemHistory parent
      ON ih.JOB = parent.SERIAL_NUMBER AND ih.SUFFIX = parent.SERIAL_NUMBER
      WHERE (inv.PRODUCT_LINE IS NULL OR inv.PRODUCT_LINE <> 'HW')
    )
    SELECT * FROM ItemHistory;
  `;

  connection.query(query, [jobNumber, suffix], (err, results) => {
    connection.end();
    if (err) {
      console.error("Error fetching recursive item history:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(results || []);
  });
});

// ==================================================
// Get customer addresses by customer code
router.get("/customer-addresses/:customerCode", (req, res) => {
  const customerCode = req.params.customerCode.trim();
  console.log("[CERT-GLOBAL] Customer addresses request for:", customerCode);

  const connection = createAWSConnection();

  const query = `
    SELECT CUSTOMER, REC, NAME_CUSTOMER, ADDRESS1, ADDRESS2, CITY, STATE, ZIP, COUNTRY
    FROM CUSTOMER_MASTER
    WHERE CUSTOMER = ?
    ORDER BY REC ASC
  `;

  connection.query(query, [customerCode], (err, results) => {
    connection.end();

    if (err) {
      console.error("Error fetching customer addresses:", err);
      return res.status(500).json({ error: "Database error" });
    }

    // Filter for valid US states
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
// Save revision log (edit)
router.post("/revision/edit", (req, res) => {
  console.log("[CERT-GLOBAL] Revision edit request:", req.body);
  const { woNo, section, serialNumber, originalData, notes } = req.body;
  const userName = req.headers["x-user"] || "SYSTEM";

  const connection = createQualityConnection();

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
  console.log("[CERT-GLOBAL] Revision delete request:", req.body);
  const { woNo, section, serialNumber, originalData, notes } = req.body;
  const userName = req.headers["x-user"] || "SYSTEM";

  const connection = createQualityConnection();

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
  console.log("[CERT-GLOBAL] Add row request:", req.body);
  const { woNo, section, rowData } = req.body;
  const userName = req.headers["x-user"] || "SYSTEM";

  if (!woNo || !section || !rowData) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const connection = createQualityConnection();

  connection.connect((err) => {
    if (err) {
      console.error("Database connection error:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    const query =
      "INSERT INTO CERT_ADD (WO_NO, SECTION, ROW_DATA, CREATE_BY) VALUES (?, ?, ?, ?)";
    const values = [woNo, section, JSON.stringify(rowData), userName];

    connection.query(query, values, (err, results) => {
      connection.end();
      if (err) {
        console.error("Error inserting CERT_ADD record:", err);
        return res.status(500).json({ error: "Failed to save new row" });
      }
      res.json({ success: true, certAddId: results.insertId, source: "mysql" });
    });
  });
});

// ==================================================
// Get all child and grandchild work orders for a given work order
router.get("/lineage/:woNumber", (req, res) => {
  const woNumber = req.params.woNumber;
  console.log("[CERT-GLOBAL] Lineage request for WO:", woNumber);

  const connection = createAWSConnection();

  const query = `
    WITH RECURSIVE WorkOrderLineage AS (
      SELECT JOB, SUFFIX, PARENT_JOB, PARENT_SUFFIX
      FROM JOB_LINE_ITEMS
      WHERE PARENT_JOB = ? AND PARENT_SUFFIX = ?
      UNION ALL
      SELECT L.JOB, L.SUFFIX, L.PARENT_JOB, L.PARENT_SUFFIX
      FROM JOB_LINE_ITEMS AS L
      INNER JOIN WorkOrderLineage AS W
      ON L.PARENT_JOB = W.JOB AND L.PARENT_SUFFIX = W.SUFFIX
    )
    SELECT * FROM WorkOrderLineage;
  `;

  const jobId = woNumber.substring(0, 6);
  const jobSuffix = woNumber.substring(7, 10);

  connection.query(query, [jobId, jobSuffix], (err, results) => {
    connection.end();

    if (err) {
      console.error("Error fetching work order lineage:", err);
      return res.status(500).json({ error: "Database error" });
    }

    res.json(results || []);
  });
});

module.exports = router;
