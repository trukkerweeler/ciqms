const express = require("express");
const mysql = require("mysql2");
const router = express.Router();

// Helper to create database connection
function createDbConnection() {
  return mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    port: 3306,
    database: "quality",
  });
}

// GET /product-char/nextId - Get next CHAR_NO for a specific product
router.get("/nextId", (req, res) => {
  const productId = req.query.productId;

  if (!productId) {
    res.status(400).json({ error: "productId query parameter is required" });
    return;
  }

  const connection = createDbConnection();
  connection.connect((err) => {
    if (err) {
      res.status(500).json({ error: "Database connection failed" });
      return;
    }

    // Find max CHAR_NO for this product
    const query =
      "SELECT MAX(CAST(CHAR_NO AS UNSIGNED)) as maxCharNo FROM PRODUCT_CHAR WHERE PRODUCT_ID = ?";
    connection.query(query, [productId], (err, rows) => {
      connection.end();

      if (err) {
        res.status(500).json({ error: "Failed to retrieve next ID" });
        return;
      }

      // Calculate next CHAR_NO (start at 1 if no records exist)
      const maxCharNo = rows[0].maxCharNo || 0;
      const nextId = maxCharNo + 1;
      const paddedId = nextId.toString().padStart(7, "0");

      res.json(paddedId);
    });
  });
});

// GET /product-char/all - Get all characteristics
router.get("/all", (req, res) => {
  const connection = createDbConnection();
  connection.connect((err) => {
    if (err) {
      res.status(500).json({ error: "Database connection failed" });
      return;
    }

    const query = "SELECT * FROM PRODUCT_CHAR ORDER BY PRODUCT_ID, CHAR_NO";
    connection.query(query, (err, rows) => {
      connection.end();

      if (err) {
        res
          .status(500)
          .json({ error: "Failed to retrieve product characteristics" });
        return;
      }

      res.json(rows || []);
    });
  });
});

// GET /product-char/search/:query - Search characteristics by product ID or name
router.get("/search/:query", (req, res) => {
  const connection = createDbConnection();
  connection.connect((err) => {
    if (err) {
      res.status(500).json({ error: "Database connection failed" });
      return;
    }

    const searchTerm = `%${req.params.query}%`;
    const query =
      "SELECT * FROM PRODUCT_CHAR WHERE PRODUCT_ID LIKE ? OR NAME LIKE ? ORDER BY PRODUCT_ID, CHAR_NO";
    connection.query(query, [searchTerm, searchTerm], (err, rows) => {
      connection.end();

      if (err) {
        res.status(500).json({ error: "Failed to search characteristics" });
        return;
      }

      res.json(rows || []);
    });
  });
});

// GET /product-char/types - Get all characteristic types from PRD_CHAR_TYPE table
router.get("/types", (req, res) => {
  const connection = createDbConnection();
  connection.connect((err) => {
    if (err) {
      res.status(500).json({ error: "Database connection failed" });
      return;
    }

    const query =
      "SELECT PRD_CHAR_TYPE, DESCRIPTION FROM PRD_CHAR_TYPE ORDER BY PRD_CHAR_TYPE";
    connection.query(query, (err, rows) => {
      connection.end();

      if (err) {
        res
          .status(500)
          .json({ error: "Failed to retrieve characteristic types" });
        return;
      }

      res.json(rows || []);
    });
  });
});

// GET /product-char/:productId - Get all characteristics for a product
router.get("/:productId", (req, res) => {
  const connection = createDbConnection();
  connection.connect((err) => {
    if (err) {
      res.status(500).json({ error: "Database connection failed" });
      return;
    }

    const query =
      "SELECT * FROM PRODUCT_CHAR WHERE PRODUCT_ID = ? ORDER BY CHAR_NO";
    connection.query(query, [req.params.productId], (err, rows) => {
      connection.end();

      if (err) {
        res
          .status(500)
          .json({ error: "Failed to retrieve product characteristics" });
        return;
      }

      res.json(rows || []);
    });
  });
});

// POST /product-char - Create new product characteristic
router.post("/", (req, res) => {
  const connection = createDbConnection();
  connection.connect((err) => {
    if (err) {
      res.status(500).json({ error: "Database connection failed" });
      return;
    }

    // Validate required fields
    if (!req.body.PRODUCT_ID) {
      connection.end();
      res.status(400).json({ error: "PRODUCT_ID is required" });
      return;
    }

    if (!req.body.REVISION_LEVEL) {
      connection.end();
      res.status(400).json({ error: "REVISION_LEVEL is required" });
      return;
    }

    // Skip PRODUCT_ID validation if user has already confirmed
    if (req.body.confirmWarning) {
      performInsert(connection, req, res);
      return;
    }

    // Check if PRODUCT_ID exists in PRODUCT table
    const productCheckQuery =
      "SELECT PRODUCT_ID FROM PRODUCT WHERE PRODUCT_ID = ?";
    connection.query(productCheckQuery, [req.body.PRODUCT_ID], (err, rows) => {
      if (err) {
        connection.end();
        res.status(500).json({ error: "Failed to validate PRODUCT_ID" });
        return;
      }

      // Product ID not found - return warning but allow user to confirm
      if (!rows || rows.length === 0) {
        connection.end();
        res.status(202).json({
          warning: `Product ID '${req.body.PRODUCT_ID}' not found in PRODUCT table`,
          requiresConfirmation: true,
        });
        return;
      }

      // Product exists, proceed with insert
      performInsert(connection, req, res);
    });
  });
});

// Helper function to perform the insert
function performInsert(connection, req, res) {
  // First, get the next CHAR_NO for this product
  const nextIdQuery =
    "SELECT MAX(CAST(CHAR_NO AS UNSIGNED)) as maxCharNo FROM PRODUCT_CHAR WHERE PRODUCT_ID = ?";

  connection.query(nextIdQuery, [req.body.PRODUCT_ID], (err, rows) => {
    if (err) {
      connection.end();
      res.status(500).json({ error: "Failed to generate next CHAR_NO" });
      return;
    }

    // Calculate next CHAR_NO (start at 1 if no records exist)
    const maxCharNo = rows[0].maxCharNo || 0;
    const nextId = maxCharNo + 1;
    const paddedCharNo = nextId.toString().padStart(7, "0");

    // Now perform the insert with the generated CHAR_NO
    const insertQuery = `
      INSERT INTO PRODUCT_CHAR (
        PRODUCT_ID, CHAR_NO, DRAWING_NO, INSP_PLAN_EQUIP_ID, NAME, TYPE,
        REVISION_LEVEL, ISSUE_DATE, STANDARD_TYPE, VARIABLE_STANDARD, UNITS,
        NOMINAL, LOWER, UPPER, PAGE, ZONE, STATUS, CATEGORY, CLASS,
        INSP_PLAN_EQP_TYPE, INSP_PLN_SAMP_SIZE, INSP_PLN_SAMP_PLAN, INSP_PLAN_AQL,
        INSP_PLAN_LEVEL, INSP_PLAN_DEV_ID, INSP_PLAN_DEV_TYPE, INSP_PLAN_CHT_TYPE,
        INSP_PLAN_MEAS_BY, INSP_PLAN_FREQ, INSP_PLAN_CHART_BY, SIGNIFICAT_DIGITS,
        SAMP_PLAN_ID, CREATE_BY, CREATE_DATE
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW()
      )
    `;

    const values = [
      req.body.PRODUCT_ID,
      paddedCharNo,
      req.body.DRAWING_NO || null,
      req.body.INSP_PLAN_EQUIP_ID || null,
      req.body.NAME || null,
      req.body.TYPE || null,
      req.body.REVISION_LEVEL,
      req.body.ISSUE_DATE || null,
      req.body.STANDARD_TYPE || null,
      req.body.VARIABLE_STANDARD || null,
      req.body.UNITS || null,
      req.body.NOMINAL || null,
      req.body.LOWER || null,
      req.body.UPPER || null,
      req.body.PAGE || null,
      req.body.ZONE || null,
      req.body.STATUS || null,
      req.body.CATEGORY || null,
      req.body.CLASS || null,
      req.body.INSP_PLAN_EQP_TYPE || null,
      req.body.INSP_PLN_SAMP_SIZE || null,
      req.body.INSP_PLN_SAMP_PLAN || null,
      req.body.INSP_PLAN_AQL || null,
      req.body.INSP_PLAN_LEVEL || null,
      req.body.INSP_PLAN_DEV_ID || null,
      req.body.INSP_PLAN_DEV_TYPE || null,
      req.body.INSP_PLAN_CHT_TYPE || null,
      req.body.INSP_PLAN_MEAS_BY || null,
      req.body.INSP_PLAN_FREQ || null,
      req.body.INSP_PLAN_CHART_BY || null,
      req.body.SIGNIFICAT_DIGITS || null,
      req.body.SAMP_PLAN_ID || null,
      req.body.CREATE_BY || "SYSTEM",
    ];

    connection.query(insertQuery, values, (err, result) => {
      connection.end();

      if (err) {
        res.status(500).json({ error: "Failed to create characteristic" });
        return;
      }

      res.status(201).json({
        message: "Characteristic created successfully",
        CHAR_NO: paddedCharNo,
      });
    });
  });
}

// PUT /product-char/:productId/:charNo - Update product characteristic
router.put("/:productId/:charNo", (req, res) => {
  const productId = req.params.productId;
  const charNo = req.params.charNo;

  if (!productId || !charNo) {
    res
      .status(400)
      .json({ error: "productId and charNo parameters are required" });
    return;
  }

  const connection = createDbConnection();
  connection.connect((err) => {
    if (err) {
      res.status(500).json({ error: "Database connection failed" });
      return;
    }

    const updateQuery = `
      UPDATE PRODUCT_CHAR SET
        DRAWING_NO = ?,
        INSP_PLAN_EQUIP_ID = ?,
        NAME = ?,
        TYPE = ?,
        REVISION_LEVEL = ?,
        ISSUE_DATE = ?,
        STANDARD_TYPE = ?,
        VARIABLE_STANDARD = ?,
        UNITS = ?,
        NOMINAL = ?,
        LOWER = ?,
        UPPER = ?,
        PAGE = ?,
        ZONE = ?,
        STATUS = ?,
        CATEGORY = ?,
        CLASS = ?,
        INSP_PLAN_EQP_TYPE = ?,
        INSP_PLN_SAMP_SIZE = ?,
        INSP_PLN_SAMP_PLAN = ?,
        INSP_PLAN_AQL = ?,
        INSP_PLAN_LEVEL = ?,
        INSP_PLAN_DEV_ID = ?,
        INSP_PLAN_DEV_TYPE = ?,
        INSP_PLAN_CHT_TYPE = ?,
        INSP_PLAN_MEAS_BY = ?,
        INSP_PLAN_FREQ = ?,
        INSP_PLAN_CHART_BY = ?,
        SIGNIFICAT_DIGITS = ?,
        SAMP_PLAN_ID = ?,
        MODIFIED_BY = ?,
        MODIFIED_DATE = NOW()
      WHERE PRODUCT_ID = ? AND CHAR_NO = ?
    `;

    const values = [
      req.body.DRAWING_NO || null,
      req.body.INSP_PLAN_EQUIP_ID || null,
      req.body.NAME || null,
      req.body.TYPE || null,
      req.body.REVISION_LEVEL || null,
      req.body.ISSUE_DATE || null,
      req.body.STANDARD_TYPE || null,
      req.body.VARIABLE_STANDARD || null,
      req.body.UNITS || null,
      req.body.NOMINAL || null,
      req.body.LOWER || null,
      req.body.UPPER || null,
      req.body.PAGE || null,
      req.body.ZONE || null,
      req.body.STATUS || null,
      req.body.CATEGORY || null,
      req.body.CLASS || null,
      req.body.INSP_PLAN_EQP_TYPE || null,
      req.body.INSP_PLN_SAMP_SIZE || null,
      req.body.INSP_PLN_SAMP_PLAN || null,
      req.body.INSP_PLAN_AQL || null,
      req.body.INSP_PLAN_LEVEL || null,
      req.body.INSP_PLAN_DEV_ID || null,
      req.body.INSP_PLAN_DEV_TYPE || null,
      req.body.INSP_PLAN_CHT_TYPE || null,
      req.body.INSP_PLAN_MEAS_BY || null,
      req.body.INSP_PLAN_FREQ || null,
      req.body.INSP_PLAN_CHART_BY || null,
      req.body.SIGNIFICAT_DIGITS || null,
      req.body.SAMP_PLAN_ID || null,
      req.body.MODIFIED_BY || "SYSTEM",
      productId,
      charNo,
    ];

    connection.query(updateQuery, values, (err, result) => {
      connection.end();

      if (err) {
        res.status(500).json({ error: "Failed to update characteristic" });
        return;
      }

      if (result.affectedRows === 0) {
        res.status(404).json({ error: "Characteristic not found" });
        return;
      }

      res.json({
        success: true,
        message: "Characteristic updated successfully",
        PRODUCT_ID: productId,
        CHAR_NO: charNo,
      });
    });
  });
});

module.exports = router;
