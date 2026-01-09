const express = require("express");
const mysql = require("mysql2");

const router = express.Router();

// Debug mode flag - set to true to enable console logging
const DEBUG_MODE = false;

// POST route to insert a new GL_DETAIL_MANUAL record
router.post("/", async (req, res) => {
  const {
    GL_ACCOUNT,
    POST_DATE,
    BATCH_NUM,
    BATCH_LINE,
    T_DATE,
    PERIOD,
    PERIOD_BEG_DATE,
    PERIOD_END_DATE,
    REFERENCE,
    AMOUNT,
    DB_CR_FLAG,
    DESCR,
    APPL_TYPE,
    TRAN_TYPE,
    VENDOR,
    AR_CODE,
    INVC_DATE,
  } = req.body;

  if (DEBUG_MODE) {
    console.log("POST /gldetail - Insert GL_DETAIL_MANUAL record", req.body);
  }

  // Format INVC_DATE to YYYYMMDD (remove dashes)
  const formattedInvcDate = INVC_DATE ? INVC_DATE.replace(/-/g, "") : null;

  try {
    const connection = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      port: 3306,
      database: "global",
    });

    const query = `
      INSERT INTO GL_DETAIL_MANUAL (
        GL_ACCOUNT,
        POST_DATE,
        BATCH_NUM,
        BATCH_LINE,
        T_DATE,
        PERIOD,
        PERIOD_BEG_DATE,
        PERIOD_END_DATE,
        REFERENCE,
        AMOUNT,
        DB_CR_FLAG,
        DESCR,
        APPL_TYPE,
        TRAN_TYPE,
        VENDOR,
        AR_CODE,
        INVC_DATE,
        LAST_CHG_BY
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      GL_ACCOUNT,
      POST_DATE,
      BATCH_NUM,
      BATCH_LINE,
      T_DATE,
      PERIOD,
      PERIOD_BEG_DATE,
      PERIOD_END_DATE,
      REFERENCE,
      AMOUNT,
      DB_CR_FLAG,
      DESCR,
      APPL_TYPE,
      TRAN_TYPE,
      VENDOR,
      AR_CODE,
      formattedInvcDate,
      "TKENT",
    ];

    connection.execute(query, values, (err, result) => {
      if (err) {
        console.error("Failed to insert GL_DETAIL_MANUAL record: " + err);
        connection.end();
        res
          .status(500)
          .json({ error: "Failed to insert record", details: err.message });
        return;
      }
      if (DEBUG_MODE) {
        console.log(`GL_DETAIL_MANUAL record inserted successfully`);
      }
      connection.end();
      res.json({
        message: "GL_DETAIL_MANUAL record created successfully",
        insertId: result.insertId,
      });
    });
  } catch (err) {
    console.error("Error connecting to DB: ", err);
    res
      .status(500)
      .json({ error: "Error connecting to DB", details: err.message });
  }
});

// GET route to retrieve GL_DETAIL_MANUAL records (optional, for verification)
router.get("/", async (req, res) => {
  const { batch_num, period, gl_account } = req.query;

  try {
    const connection = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      port: 3306,
      database: "global",
    });

    let query = "SELECT * FROM GL_DETAIL_MANUAL WHERE 1=1";
    const values = [];

    if (batch_num) {
      query += " AND BATCH_NUM = ?";
      values.push(batch_num);
    }
    if (period) {
      query += " AND PERIOD = ?";
      values.push(period);
    }
    if (gl_account) {
      query += " AND GL_ACCOUNT = ?";
      values.push(gl_account);
    }

    query += " ORDER BY POST_DATE DESC LIMIT 100";

    connection.execute(query, values, (err, rows) => {
      if (err) {
        console.error("Failed to retrieve GL_DETAIL_MANUAL records: " + err);
        connection.end();
        res.status(500).json({ error: "Failed to retrieve records" });
        return;
      }
      connection.end();
      res.json(rows);
    });
  } catch (err) {
    console.error("Error connecting to DB: ", err);
    res.status(500).json({ error: "Error connecting to DB" });
  }
});

// GET route to retrieve a specific GL_DETAIL_MANUAL record by BATCH_NUM and BATCH_LINE
router.get("/:batch_num/:batch_line", async (req, res) => {
  const { batch_num, batch_line } = req.params;

  try {
    const connection = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      port: 3306,
      database: "global",
    });

    const query = `
      SELECT * FROM GL_DETAIL_MANUAL 
      WHERE BATCH_NUM = ? AND BATCH_LINE = ?
    `;

    connection.execute(query, [batch_num, batch_line], (err, rows) => {
      if (err) {
        console.error("Failed to retrieve GL_DETAIL_MANUAL record: " + err);
        connection.end();
        res.status(500).json({ error: "Failed to retrieve record" });
        return;
      }
      if (rows.length === 0) {
        connection.end();
        res.status(404).json({ message: "Record not found" });
        return;
      }
      connection.end();
      res.json(rows[0]);
    });
  } catch (err) {
    console.error("Error connecting to DB: ", err);
    res.status(500).json({ error: "Error connecting to DB" });
  }
});

// POST route to create a correction entry (reversal + corrected entry)
router.post("/createCorrection", async (req, res) => {
  const {
    GL_ACCOUNT,
    POST_DATE,
    BATCH_NUM,
    T_DATE,
    PERIOD,
    PERIOD_BEG_DATE,
    PERIOD_END_DATE,
    REFERENCE,
    AMOUNT,
    DB_CR_FLAG,
    DESCR,
    APPL_TYPE,
    TRAN_TYPE,
    VENDOR,
    AR_CODE,
    INVC_DATE,
    CORRECT_POST_DATE,
    CORRECT_PERIOD,
    CORRECT_PERIOD_BEG_DATE,
    CORRECT_PERIOD_END_DATE,
    ORIG_BATCH_NUM,
    ORIG_BATCH_LINE,
  } = req.body;

  // Debug logging
  console.log("=== POST /gldetail/createCorrection ===");
  console.log("Received GL_ACCOUNT:", GL_ACCOUNT);
  console.log("Received ORIG_BATCH_NUM:", ORIG_BATCH_NUM);
  console.log("Received ORIG_BATCH_LINE:", ORIG_BATCH_LINE);
  console.log("Full request body:", req.body);

  if (DEBUG_MODE) {
    console.log(
      "POST /gldetail/createCorrection - Create reversal + correction",
      req.body
    );
  }

  const formattedInvcDate = INVC_DATE ? INVC_DATE.replace(/-/g, "") : null;

  try {
    const connection = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      port: 3306,
      database: "global",
    });

    // Get the next available correction batch number (X1, X2, X3, etc.)
    const getMaxCorrectionBatchQuery = `
      SELECT MAX(CAST(SUBSTRING(BATCH_NUM, 2) AS UNSIGNED)) as maxNum 
      FROM GL_DETAIL_MANUAL 
      WHERE BATCH_NUM LIKE 'X%'
    `;

    connection.execute(getMaxCorrectionBatchQuery, [], (err, result) => {
      if (err) {
        console.error("Failed to get max correction batch: " + err);
        connection.end();
        return res.status(500).json({ error: "Failed to get batch number" });
      }

      // Generate next correction batch number (X1, X2, X3, etc.)
      const nextCorrectionNum = (result[0].maxNum || 0) + 1;
      const correctionBatchNum = "X" + nextCorrectionNum;

      // Get the next BATCH_LINE for this correction batch
      const getMaxBatchLineQuery = `
        SELECT MAX(BATCH_LINE) as maxLine FROM GL_DETAIL_MANUAL 
        WHERE BATCH_NUM = ?
      `;

      connection.execute(
        getMaxBatchLineQuery,
        [correctionBatchNum],
        (err, result) => {
          if (err) {
            console.error("Failed to get max batch line: " + err);
            connection.end();
            return res.status(500).json({ error: "Failed to get batch line" });
          }

          let reversalBatchLine = (parseInt(result[0].maxLine) || 0) + 1;
          let correctionBatchLine = reversalBatchLine + 1;

          // Insert REVERSAL entry (negated amount, original date)
          const reversalQuery = `
            INSERT INTO GL_DETAIL_MANUAL (
              GL_ACCOUNT, POST_DATE, BATCH_NUM, BATCH_LINE, T_DATE, PERIOD,
              PERIOD_BEG_DATE, PERIOD_END_DATE, REFERENCE, AMOUNT, DB_CR_FLAG,
              DESCR, APPL_TYPE, TRAN_TYPE, VENDOR, AR_CODE, INVC_DATE, LAST_CHG_BY, LAST_CHG_DATE
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;

          const reversalValues = [
            GL_ACCOUNT,
            POST_DATE,
            correctionBatchNum,
            reversalBatchLine,
            T_DATE,
            PERIOD,
            PERIOD_BEG_DATE,
            PERIOD_END_DATE,
            REFERENCE +
              ` [REVERSAL of orig ${ORIG_BATCH_NUM}:${ORIG_BATCH_LINE}]`,
            -AMOUNT, // Negate the amount
            DB_CR_FLAG,
            DESCR + ` [REVERSAL of orig ${ORIG_BATCH_NUM}:${ORIG_BATCH_LINE}]`,
            APPL_TYPE,
            TRAN_TYPE,
            VENDOR,
            AR_CODE,
            formattedInvcDate,
            "TKENT",
            new Date().toISOString().split("T")[0],
          ];

          console.log(
            "About to insert REVERSAL entry with GL_ACCOUNT:",
            GL_ACCOUNT
          );
          console.log("REVERSAL insert values:", reversalValues);
          console.log(
            "REVERSAL REFERENCE value:",
            reversalValues[8],
            "(ORIG_BATCH: " + ORIG_BATCH_NUM + ":" + ORIG_BATCH_LINE + ")"
          );

          // Insert reversal with retry on duplicate key
          const insertReversalWithRetry = (batchLine, retryCount = 0) => {
            const currentReversalValues = [...reversalValues];
            currentReversalValues[3] = batchLine; // Update BATCH_LINE

            connection.execute(reversalQuery, currentReversalValues, (err) => {
              if (err) {
                if (err.code === "ER_DUP_ENTRY" && retryCount < 5) {
                  // Duplicate key error - retry with next batch line
                  console.log(
                    `Duplicate key for BATCH_LINE ${batchLine}, retrying with ${
                      batchLine + 1
                    }`
                  );
                  insertReversalWithRetry(batchLine + 1, retryCount + 1);
                } else {
                  console.error("Failed to insert reversal entry: " + err);
                  connection.end();
                  return res
                    .status(500)
                    .json({ error: "Failed to create reversal" });
                }
              } else {
                // Reversal inserted successfully, now insert correction
                const correctionBatchLine = batchLine + 1;
                insertCorrectionWithRetry(correctionBatchLine);
              }
            });
          };

          // Insert correction query definition and retry function
          const correctionQuery = `
            INSERT INTO GL_DETAIL_MANUAL (
              GL_ACCOUNT, POST_DATE, BATCH_NUM, BATCH_LINE, T_DATE, PERIOD,
              PERIOD_BEG_DATE, PERIOD_END_DATE, REFERENCE, AMOUNT, DB_CR_FLAG,
              DESCR, APPL_TYPE, TRAN_TYPE, VENDOR, AR_CODE, INVC_DATE, LAST_CHG_BY, LAST_CHG_DATE
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;

          const correctionValues = [
            GL_ACCOUNT,
            CORRECT_POST_DATE,
            correctionBatchNum,
            correctionBatchLine,
            CORRECT_POST_DATE,
            CORRECT_PERIOD,
            CORRECT_PERIOD_BEG_DATE,
            CORRECT_PERIOD_END_DATE,
            REFERENCE +
              ` [CORRECTION of orig ${ORIG_BATCH_NUM}:${ORIG_BATCH_LINE}]`,
            AMOUNT,
            DB_CR_FLAG,
            DESCR +
              ` [CORRECTION of orig ${ORIG_BATCH_NUM}:${ORIG_BATCH_LINE}]`,
            APPL_TYPE,
            TRAN_TYPE,
            VENDOR,
            AR_CODE,
            formattedInvcDate,
            "TKENT",
            new Date().toISOString().split("T")[0],
          ];

          const insertCorrectionWithRetry = (batchLine, retryCount = 0) => {
            const currentCorrectionValues = [...correctionValues];
            currentCorrectionValues[3] = batchLine; // Update BATCH_LINE

            connection.execute(
              correctionQuery,
              currentCorrectionValues,
              (err) => {
                if (err) {
                  if (err.code === "ER_DUP_ENTRY" && retryCount < 5) {
                    // Duplicate key error - retry with next batch line
                    console.log(
                      `Duplicate key for BATCH_LINE ${batchLine}, retrying with ${
                        batchLine + 1
                      }`
                    );
                    insertCorrectionWithRetry(batchLine + 1, retryCount + 1);
                  } else {
                    console.error("Failed to insert correction entry: " + err);
                    connection.end();
                    return res
                      .status(500)
                      .json({ error: "Failed to create correction" });
                  }
                } else {
                  // Both entries inserted successfully
                  res.json({
                    message: "Correction entries created successfully",
                    reversalBatchLine,
                    correctionBatchLine: batchLine,
                  });
                  connection.end();
                }
              }
            );
          };

          // Start the insert process
          insertReversalWithRetry(reversalBatchLine);
        }
      );
    });
  } catch (err) {
    console.error("Error in createCorrection route: " + err);
    res.status(500).json({ error: "Error creating correction" });
  }
});

module.exports = router;
