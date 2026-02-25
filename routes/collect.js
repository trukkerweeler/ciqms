const express = require("express");
const router = express.Router();
const mysql = require("mysql2");

// ==================================================
// PRODUCT PLAN DATA endpoints - Collection Request Handling
// ==================================================

// GET all product plan data records
router.get("/prod-plan-data", (req, res) => {
  console.log("\n====== GET /prod-plan-data CALLED ======");
  try {
    const connection = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      port: 3306,
      database: "quality",
    });

    connection.connect((err) => {
      if (err) {
        console.error("ERROR connecting to DB:", err.message);
        return res
          .status(500)
          .json({ error: "DB connection failed", detail: err.message });
      }

      console.log("✓ Connected to quality database");

      // Get table structure info for debugging
      const infoQuery = `DESCRIBE PRODUCT_PLAN_DATA`;
      connection.query(infoQuery, (err, columns) => {
        if (err) {
          console.error("ERROR describing table:", err.message);
        } else {
          console.log(
            "PRODUCT_PLAN_DATA columns:",
            columns.map((c) => c.Field).join(", "),
          );
        }

        // Now run the actual select query
        const query = `SELECT * FROM PRODUCT_PLAN_DATA ORDER BY COLLECTION_DATE DESC`;
        console.log("Executing query:", query);

        connection.query(query, (err, rows) => {
          if (err) {
            console.error("ERROR executing query:", err.message);
            return res
              .status(500)
              .json({ error: "Query failed", detail: err.message });
          } else {
            console.log("✓ Query successful, rows returned:", rows.length);
            if (rows.length > 0) {
              console.log("First row keys:", Object.keys(rows[0]));
            } else {
              console.log("⚠ No rows returned from database");
            }
            res.json(rows);
          }
          connection.end();
        });
      });
    });
  } catch (err) {
    console.error("EXCEPTION in /prod-plan-data:", err.message);
    res.status(500).json({ error: "Exception occurred", detail: err.message });
  }
});

// GET product plan data by ID (PRODUCT_ID or PRODUCT_COLLECT_ID)
router.get("/prod-plan-data/:id", (req, res) => {
  const id = req.params.id;
  try {
    const connection = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      port: 3306,
      database: "quality",
    });

    connection.connect((err) => {
      if (err) {
        console.error(
          "Error connecting to DB for PRODUCT_PLAN_DATA by id: " + err.stack,
        );
        return res.sendStatus(500);
      }

      const query = `SELECT * FROM PRODUCT_PLAN_DATA p WHERE p.PRODUCT_ID = ? OR p.PRODUCT_COLLECT_ID = ? ORDER BY p.COLLECTION_DATE DESC`;
      connection.query(query, [id, id], (err, rows) => {
        if (err) {
          console.error("Failed to query PRODUCT_PLAN_DATA by id: " + err);
          res.sendStatus(500);
        } else {
          res.json(rows);
        }
        connection.end();
      });
    });
  } catch (err) {
    console.error("Error in /prod-plan-data/:id:", err);
    res.sendStatus(500);
  }
});

// POST - Create a new PRODUCT_PLAN_DATA record
router.post("/prod-plan-data", (req, res) => {
  try {
    const connection = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      port: 3306,
      database: "quality",
    });

    connection.connect((err) => {
      if (err) {
        console.error(
          "Error connecting to DB for PRODUCT_PLAN_DATA: " + err.stack,
        );
        return res.sendStatus(500);
      }

      const {
        PRODUCT_ID,
        PRODUCT_REV_LEVEL,
        OPERATION_NO,
        COLLECTION_DATE,
        PO_NUMBER,
        LOT_NUMBER,
        LOT_SIZE,
        ASSIGNED_TO,
        DUE_DATE,
        ACCEPTED,
        REJECTED,
        NCM_ID,
        CREATE_BY,
        CREATE_DATE,
      } = req.body;

      const query = `INSERT INTO PRODUCT_PLAN_DATA (
        PRODUCT_ID,
        PRODUCT_REV_LEVEL,
        OPERATION_NO,
        COLLECTION_DATE,
        PO_NUMBER,
        LOT_NUMBER,
        LOT_SIZE,
        ASSIGNED_TO,
        DUE_DATE,
        ACCEPTED,
        REJECTED,
        NCM_ID,
        CREATE_BY,
        CREATE_DATE
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      const values = [
        PRODUCT_ID,
        PRODUCT_REV_LEVEL,
        OPERATION_NO,
        COLLECTION_DATE,
        PO_NUMBER || null,
        LOT_NUMBER || null,
        LOT_SIZE || null,
        ASSIGNED_TO || null,
        DUE_DATE || null,
        ACCEPTED || null,
        REJECTED || null,
        NCM_ID || null,
        CREATE_BY,
        CREATE_DATE,
      ];

      connection.query(query, values, (err, result) => {
        if (err) {
          console.error("Error inserting PRODUCT_PLAN_DATA: " + err);
          res.sendStatus(500);
        } else {
          // Return the full saved record so frontend can display it immediately
          res.json({
            success: true,
            record: {
              PRODUCT_COLLECT_ID: result.insertId,
              PRODUCT_ID,
              PRODUCT_REV_LEVEL,
              OPERATION_NO,
              COLLECTION_DATE,
              PO_NUMBER,
              LOT_NUMBER,
              LOT_SIZE,
              ASSIGNED_TO,
              DUE_DATE,
              ACCEPTED,
              REJECTED,
              NCM_ID,
              CREATE_BY,
              CREATE_DATE,
            },
          });
        }
        connection.end();
      });
    });
  } catch (err) {
    console.error("Error in POST /prod-plan-data:", err);
    res.sendStatus(500);
  }
});

// GET - Check if PRODUCT_INSP_PLAN exists with matching PRODUCT_ID and REVISION
router.get(
  "/insp-plan/:productId/:productRevLevel/:operationNo",
  (req, res) => {
    const productId = req.params.productId;
    const productRevLevel = req.params.productRevLevel;
    const operationNo = req.params.operationNo;

    try {
      const connection = mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        port: 3306,
        database: "quality",
      });

      connection.connect((err) => {
        if (err) {
          console.error("Error connecting to DB:", err.message);
          return res
            .status(500)
            .json({ error: "DB connection failed", detail: err.message });
        }

        const query = `SELECT * FROM PRODUCT_INSP_PLAN WHERE PRODUCT_ID = ? AND PRODUCT_REV_LEVEL = ? AND OPERATION_NO = ?`;
        connection.query(
          query,
          [productId, productRevLevel, operationNo],
          (err, rows) => {
            if (err) {
              console.error("Failed to query PRODUCT_INSP_PLAN:", err);
              return res
                .status(500)
                .json({ error: "Query failed", detail: err.message });
            }
            res.json({ found: rows.length > 0, records: rows });
            connection.end();
          },
        );
      });
    } catch (err) {
      console.error("Exception in /insp-plan:", err.message);
      res
        .status(500)
        .json({ error: "Exception occurred", detail: err.message });
    }
  },
);

module.exports = router;
