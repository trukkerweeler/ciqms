// routes/xcert.js - Express route for xcert
const express = require("express");
const mysql = require("mysql2");
const path = require("path");
const router = express.Router();

// ==================================================
// Shared DB connection function for both endpoints
function getDbConnection() {
  return mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    port: 3306,
    database: "global",
    multipleStatements: true,
  });
}

// Get all distinct SERIAL_NUMBERs in lineage for a given JOB (excluding PRODUCT_LINE = 'HW')
router.get("/lineage/:job", async (req, res) => {
  try {
    connection = getDbConnection();
    const job = req.params.job;
    const query = `
      WITH RECURSIVE ItemHistory AS (
        SELECT DISTINCT
            ih.PART,
            ih.JOB,
            ih.SUFFIX,
            ih.SERIAL_NUMBER
        FROM global.ITEM_HISTORY ih
        LEFT JOIN global.INVENTORY_MSTR inv ON ih.PART = inv.PART
        WHERE ih.JOB = ?
          AND (inv.PRODUCT_LINE IS NULL OR inv.PRODUCT_LINE <> 'HW')

        UNION ALL

        SELECT
            ih.PART,
            ih.JOB,
            ih.SUFFIX,
            ih.SERIAL_NUMBER
        FROM global.ITEM_HISTORY ih
        LEFT JOIN global.INVENTORY_MSTR inv ON ih.PART = inv.PART
        INNER JOIN ItemHistory parent
            ON ih.JOB = parent.SERIAL_NUMBER
           AND ih.SUFFIX = parent.SERIAL_NUMBER
        WHERE (inv.PRODUCT_LINE IS NULL OR inv.PRODUCT_LINE <> 'HW')
      )
      SELECT DISTINCT SERIAL_NUMBER
      FROM ItemHistory
      WHERE SERIAL_NUMBER REGEXP '^[0-9]{6}-[0-9]{3}$';
    `;

    connection.query(query, [job], (err, rows) => {
      connection.end();
      if (err) {
        console.error("Failed to query lineage: " + err);
        res.sendStatus(500);
        return;
      }
      res.json(rows);
    });
  } catch (err) {
    console.error("Error connecting to DB: ", err);
    res.sendStatus(500);
  }
});

// ==================================================
// POST /acert/process
// Body: { process: "HEAT", serial: "6061" }
router.post("/process", async (req, res) => {
  let connection;
  try {
    const { process, serial } = req.body;
    if (!process || !serial) {
      console.error("Missing process or serial", req.body);
      return res.status(400).json({ error: "Missing process or serial" });
    }
    const processMap = {
      HEAT: { operation: "FT1C1A", job: 122353, suffix: "002" },
      SWLD: { operation: "D171", job: 122354, suffix: "003" },
      FWLD: { operation: "FUSION", job: 122355, suffix: "004" },
      PASS: { operation: "PASSOP", job: 122356, suffix: "005" },
      CHEM: { operation: "CHEMOP", job: 122357, suffix: "006" },
      PAINT: { operation: "", job: null, suffix: null },
    };
    const opData = processMap[process];
    if (!opData || !opData.operation) {
      console.warn("No opData for process", process);
      return res.json([]); // No data for PAINT or unknown
    }
    connection = getDbConnection();
    // ...existing code for routerNum query and process query...
    connection.query(
      "SELECT ROUTER FROM JOB_OPERATIONS WHERE JOB = ? AND SUFFIX = ? LIMIT 1",
      [opData.job, opData.suffix],
      (err, routerRows) => {
        if (err) {
          if (connection && connection.end)
            try {
              connection.end();
            } catch {}
          console.error("MySQL error fetching routerNum", err);
          return res.status(500).json({ error: err.message });
        }
        const routerNum =
          routerRows && routerRows[0] ? routerRows[0].ROUTER : null;
        if (!routerNum) {
          if (connection && connection.end)
            try {
              connection.end();
            } catch {}
          console.warn(
            "No ROUTER found for JOB/SUFFIX",
            opData.job,
            opData.suffix,
          );
          return res.json([]);
        }
        const query = `
SET @router    = SUBSTRING_INDEX(?, ' ', 1);
SET @operation = ?;
SET @job       = ?;
SET @suffix    = ?;
SELECT
    rl.ROUTER,
    jo.JOB,
    jo.SUFFIX,
    rl.LINE_ROUTER,
    jo.SEQ,
    jo.ROUTER_SEQ,
    rl.LMO,
    rl.PART_WC_OUTSIDE,
    rl.OPERATION,
    jo.OPERATION AS JOB_OPERATION,
    jd.REFERENCE,
    jo.DATE_COMPLETED,
    jo.DESCRIPTION
FROM ROUTER_LINE rl
JOIN JOB_OPERATIONS jo
  ON jo.ROUTER_SEQ BETWEEN rl.LINE_ROUTER AND rl.LINE_ROUTER + 99
     AND jo.JOB = @job
     AND jo.SUFFIX = @suffix
LEFT JOIN (
  SELECT JOB, SUFFIX, SEQ, MAX(REFERENCE) AS REFERENCE
  FROM JOB_DETAIL
  GROUP BY JOB, SUFFIX, SEQ
) jd
  ON jd.JOB like jo.JOB
     AND jd.SUFFIX = jo.SUFFIX
     AND jd.SEQ = jo.SEQ
WHERE SUBSTRING_INDEX(rl.ROUTER,' ',1) like SUBSTRING_INDEX(jo.ROUTER,' ',1)
  AND rl.OPERATION = @operation
  AND jd.REFERENCE IS NOT NULL;
`;
        connection.query(
          query,
          [routerNum, opData.operation, opData.job, opData.suffix],
          (err, results) => {
            try {
              if (connection && connection.end) connection.end();
            } catch {}
            if (err) {
              console.error("MySQL error in /acert/process", err);
              return res.status(500).json({ error: err.message });
            }
            const rows = Array.isArray(results)
              ? results[results.length - 1]
              : [];
            res.json(rows);
          },
        );
      },
    );
  } catch (err) {
    console.error("Logic error in /acert/process", err);
    if (connection && connection.end) {
      try {
        connection.end();
      } catch {}
    }
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
