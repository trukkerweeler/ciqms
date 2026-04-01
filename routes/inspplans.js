const express = require("express");
const router = express.Router();
const mysql = require("mysql2");

// ==================================================
// INSPECTION PLANS endpoints - 2-step workflow
// Step 1: Lookup PRODUCT_INSP_PLAN by Product+Operation+RevLevel
// Step 2: Create/manage PRD_INSP_PLN_CHR (characteristic-specific plans)
// ==================================================

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

// GET characteristics for a product - STEP 1: Load available chars
router.get("/chars/:productId", (req, res) => {
  console.log(
    `[inspplans] Loading characteristics for product: ${req.params.productId}`,
  );
  const connection = createDbConnection();
  connection.connect((err) => {
    if (err) {
      console.error("DB Connection error:", err);
      res
        .status(500)
        .json({ error: "Database connection failed", details: err.message });
      return;
    }

    const query = `
      SELECT 
        *
      FROM PRODUCT_CHAR
      WHERE PRODUCT_ID = ?
      ORDER BY CHAR_NO
    `;

    connection.query(query, [req.params.productId], (err, rows) => {
      connection.end();

      if (err) {
        console.error("Query error:", err);
        res.status(500).json({
          error: "Failed to retrieve characteristics",
          details: err.message,
        });
        return;
      }

      console.log(
        `[inspplans] Found ${rows ? rows.length : 0} characteristics`,
      );
      res.json(rows || []);
    });
  });
});

// GET lookup - STEP 1: Check if PRODUCT_INSP_PLAN exists
router.get("/lookup/:productId/:operationNo/:productRevLevel", (req, res) => {
  const { productId, operationNo, productRevLevel } = req.params;
  console.log(
    `[inspplans] Lookup plan: ${productId} / ${operationNo} / ${productRevLevel}`,
  );

  const connection = createDbConnection();
  connection.connect((err) => {
    if (err) {
      res.status(500).json({ error: "Database connection failed" });
      return;
    }

    const query = `
      SELECT *
      FROM PRODUCT_INSP_PLAN
      WHERE PRODUCT_ID = ? AND OPERATION_NO = ? AND PRODUCT_REV_LEVEL = ?
    `;

    connection.query(
      query,
      [productId, operationNo, productRevLevel],
      (err, rows) => {
        connection.end();

        if (err) {
          console.error("Query error:", err);
          res.status(500).json({ error: "Failed to lookup plan" });
          return;
        }

        if (rows && rows.length > 0) {
          res.json({
            exists: true,
            plan: rows[0],
          });
        } else {
          res.json({
            exists: false,
            plan: null,
          });
        }
      },
    );
  });
});

// GET all PRD_INSP_PLN_CHR records (the actual inspection plans)
router.get("/", (req, res) => {
  const connection = createDbConnection();
  connection.connect((err) => {
    if (err) {
      console.error("DB Connection error:", err);
      res
        .status(500)
        .json({ error: "Database connection failed", details: err.message });
      return;
    }

    const query = `
      SELECT 
        pic.ROWID,
        pic.PRD_INSP_PLN_SYSID,
        pic.CHAR_NUMBER,
        pic.MEASURE_BY,
        pic.INSP_PLAN_LEVEL,
        pic.DEVICE_ID,
        pic.SAMPLE_SIZE,
        pip.PRODUCT_ID,
        pip.OPERATION_NO,
        pip.PRODUCT_REV_LEVEL,
        pip.PLAN_NAME,
        pip.PLAN_REV_LEVEL,
        pc.CHAR_NO,
        pc.NAME as CHAR_NAME
      FROM PRD_INSP_PLN_CHR pic
      JOIN PRODUCT_INSP_PLAN pip ON pic.PRD_INSP_PLN_SYSID = pip.PRD_INSP_PLN_SYSID
      LEFT JOIN PRODUCT_CHAR pc ON pic.CHAR_NUMBER = pc.CHAR_NO AND pip.PRODUCT_ID = pc.PRODUCT_ID
      ORDER BY pip.PRODUCT_ID, pip.OPERATION_NO, pic.CHAR_NUMBER
    `;

    connection.query(query, (err, rows) => {
      connection.end();

      if (err) {
        console.error("Query error:", err);
        res.status(500).json({
          error: "Failed to retrieve inspection plans",
          details: err.message,
        });
        return;
      }

      res.json(rows || []);
    });
  });
});

// POST - STEP 2: Create/get PRODUCT_INSP_PLAN and bulk create PRD_INSP_PLN_CHR records
router.post("/", async (req, res) => {
  const {
    PRODUCT_ID,
    OPERATION_NO,
    PRODUCT_REV_LEVEL,
    PLAN_NAME,
    characteristics, // Array of CHAR_NUMBER values to include in plan
  } = req.body;

  // Validate required fields
  if (!PRODUCT_ID || !OPERATION_NO || !PRODUCT_REV_LEVEL) {
    res.status(400).json({
      error: "PRODUCT_ID, OPERATION_NO, and PRODUCT_REV_LEVEL are required",
    });
    return;
  }

  if (!Array.isArray(characteristics) || characteristics.length === 0) {
    res.status(400).json({
      error: "At least one characteristic must be selected",
    });
    return;
  }

  // Use promise-based mysql for ID generation
  const mysql = require("mysql2/promise");

  try {
    const idConnection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      port: 3306,
      database: "quality",
    });

    // Check if PRODUCT_INSP_PLAN already exists for this product/operation/revision
    const [existingPlan] = await idConnection.execute(
      "SELECT PRD_INSP_PLN_SYSID FROM PRODUCT_INSP_PLAN WHERE PRODUCT_ID = ? AND OPERATION_NO = ? AND PRODUCT_REV_LEVEL = ?",
      [PRODUCT_ID, OPERATION_NO, PRODUCT_REV_LEVEL],
    );

    let PRD_INSP_PLN_SYSID;

    if (existingPlan && existingPlan.length > 0) {
      // Use existing plan
      PRD_INSP_PLN_SYSID = existingPlan[0].PRD_INSP_PLN_SYSID;
      console.log(`[inspplans] Using existing plan: ${PRD_INSP_PLN_SYSID}`);
    } else {
      // Generate new PRODUCT_INSP_PLAN ID
      const [idRows] = await idConnection.execute(
        "SELECT CURRENT_ID FROM SYSTEM_IDS WHERE TABLE_NAME = ?",
        ["PRODUCT_INSP_PLAN"],
      );

      if (idRows.length === 0) {
        await idConnection.end();
        res
          .status(400)
          .json({ error: "PRODUCT_INSP_PLAN not found in SYSTEM_IDS" });
        return;
      }

      const nextId = parseInt(idRows[0].CURRENT_ID) + 1;
      PRD_INSP_PLN_SYSID = nextId.toString().padStart(7, "0");

      await idConnection.execute(
        "UPDATE SYSTEM_IDS SET CURRENT_ID = ? WHERE TABLE_NAME = ?",
        [PRD_INSP_PLN_SYSID, "PRODUCT_INSP_PLAN"],
      );

      // Create the PRODUCT_INSP_PLAN record
      await idConnection.execute(
        `INSERT INTO PRODUCT_INSP_PLAN (
          PRD_INSP_PLN_SYSID,
          PRODUCT_ID,
          OPERATION_NO,
          PRODUCT_REV_LEVEL,
          PLAN_NAME
        ) VALUES (?, ?, ?, ?, ?)`,
        [
          PRD_INSP_PLN_SYSID,
          PRODUCT_ID,
          OPERATION_NO,
          PRODUCT_REV_LEVEL,
          PLAN_NAME || null,
        ],
      );

      console.log(`[inspplans] Created new plan: ${PRD_INSP_PLN_SYSID}`);
    }

    await idConnection.end();

    // Now create PRD_INSP_PLN_CHR records for each selected characteristic
    const connection = createDbConnection();
    connection.connect((err) => {
      if (err) {
        console.error("DB Connection error:", err);
        res.status(500).json({ error: "Database connection failed" });
        return;
      }

      let successCount = 0;
      let errorCount = 0;
      let skippedCount = 0;
      const errors = [];
      let processed = 0;

      const processNext = () => {
        if (processed >= characteristics.length) {
          connection.end();
          res.json({
            success: true,
            message: `Created ${successCount} characteristic plan(s)${skippedCount > 0 ? `, skipped ${skippedCount} (already exist)` : ""}`,
            sysId: PRD_INSP_PLN_SYSID,
            created: successCount,
            skipped: skippedCount,
            errors: errorCount > 0 ? errors : undefined,
          });
          return;
        }

        const charNumber = characteristics[processed];
        processed++;

        // First check if this characteristic already exists for this plan
        const checkQuery = `
          SELECT 1 FROM PRD_INSP_PLN_CHR 
          WHERE PRD_INSP_PLN_SYSID = ? AND CHAR_NUMBER = ?
        `;

        connection.query(
          checkQuery,
          [PRD_INSP_PLN_SYSID, charNumber],
          (err, existing) => {
            if (err) {
              console.error("Check query error:", err);
              errorCount++;
              errors.push({ char: charNumber, error: err.message });
              processNext();
              return;
            }

            // If already exists, skip
            if (existing && existing.length > 0) {
              console.log(
                `[inspplans] Characteristic ${charNumber} already exists in plan ${PRD_INSP_PLN_SYSID}, skipping`,
              );
              skippedCount++;
              processNext();
              return;
            }

            // Otherwise, insert it
            const insertQuery = `
            INSERT INTO PRD_INSP_PLN_CHR (
              PRD_INSP_PLN_SYSID,
              CHAR_NUMBER
            ) VALUES (?, ?)
          `;

            connection.query(
              insertQuery,
              [PRD_INSP_PLN_SYSID, charNumber],
              (err, result) => {
                if (err) {
                  console.error("Insert error:", err);
                  errorCount++;
                  errors.push({ char: charNumber, error: err.message });
                } else {
                  successCount++;
                }
                processNext();
              },
            );
          },
        );
      };

      processNext();
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Failed to create inspection plan" });
  }
});

// DELETE a specific characteristic from a plan
router.delete("/:sysId/:charNumber", (req, res) => {
  const { sysId, charNumber } = req.params;

  if (!sysId || !charNumber) {
    res.status(400).json({ error: "sysId and charNumber are required" });
    return;
  }

  const connection = createDbConnection();
  connection.connect((err) => {
    if (err) {
      res.status(500).json({ error: "Database connection failed" });
      return;
    }

    const query = `
      DELETE FROM PRD_INSP_PLN_CHR 
      WHERE PRD_INSP_PLN_SYSID = ? AND CHAR_NUMBER = ?
    `;

    connection.query(query, [sysId, charNumber], (err, result) => {
      connection.end();

      if (err) {
        console.error("Delete error:", err);
        res.status(500).json({
          error: "Failed to delete characteristic plan",
          details: err.message,
        });
        return;
      }

      if (result.affectedRows === 0) {
        res.status(404).json({ error: "Characteristic plan not found" });
        return;
      }

      res.json({
        success: true,
        message: "Characteristic plan deleted successfully",
      });
    });
  });
});

module.exports = router;
