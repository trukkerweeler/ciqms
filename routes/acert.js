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

// Shared DB connection function for quality database
function getQualityDbConnection() {
  return mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    port: 3306,
    database: "quality",
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
    const { baseWorkorder, operationCodes } = req.body;
    if (
      !baseWorkorder ||
      !Array.isArray(operationCodes) ||
      operationCodes.length === 0
    ) {
      console.error("Missing baseWorkorder or operationCodes", req.body);
      return res
        .status(400)
        .json({ error: "Missing baseWorkorder or operationCodes" });
    }
    connection = getDbConnection();
    const query = `
      SELECT DISTINCT
          rl.ROUTER,
          jo.JOB,
          jo.SUFFIX,
          jd.REFERENCE,
          jo.DATE_COMPLETED,
          rl.OPERATION,
          jo.DESCRIPTION
      FROM ITEM_HISTORY ih
      JOIN ROUTER_LINE rl
            ON rl.ROUTER = ih.PART
      JOIN JOB_OPERATIONS jo
            ON CAST(jo.ROUTER_SEQ AS UNSIGNED)
               BETWEEN CAST(rl.LINE_ROUTER AS UNSIGNED)
                   AND CAST(rl.LINE_ROUTER AS UNSIGNED) + 99
      JOIN JOB_DETAIL jd
            ON jd.JOB = jo.JOB
           AND jd.SUFFIX = jo.SUFFIX
           AND jd.SEQ = jo.SEQ
      WHERE ih.JOB = ?
        AND ih.SERIAL_NUMBER LIKE '______-___'
        AND jo.JOB = CAST(SUBSTRING(ih.SERIAL_NUMBER, 1, 6) AS UNSIGNED)
        AND jo.SUFFIX = CAST(SUBSTRING(ih.SERIAL_NUMBER, 8, 3) AS UNSIGNED)
        AND rl.OPERATION IN (${Array.from({ length: operationCodes.length })
          .map(() => "?")
          .join(",")})
        AND jd.REFERENCE IS NOT NULL;
    `;
    const params = [baseWorkorder, ...operationCodes];
    connection.query(query, params, (err, rows) => {
      try {
        if (connection && connection.end) connection.end();
      } catch {}
      if (err) {
        console.error("MySQL error in /acert/process", err);
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    });
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

// ==================================================
// POST 01TE temperature data collection
router.post("/:iid", (req, res) => {
  try {
    const connection = getQualityDbConnection();
    connection.connect(function (err) {
      if (err) {
        console.error("Error connecting: " + err.stack);
        return;
      }

      let key = Object.keys(req.body)[0];
      const iid = req.params.iid;
      const percent = req.body[key].PERCENT;
      const fahrenheit = req.body[key].FAHRENHEIT;

      let insertCount = 0;
      let errorOccurred = false;

      // Only insert PERCENT entry if provided
      if (percent) {
        const percentQuery = `INSERT INTO EIGHTYFIVETWELVE (INPUT_ID, UNIT, VALUE) 
          VALUES ('${iid}', 'Percent', '${percent}')`;

        connection.query(percentQuery, (err, rows, fields) => {
          if (err) {
            console.log(
              "Failed to insert Percent into EIGHTYFIVETWELVE: " + err,
            );
            errorOccurred = true;
          }
          insertCount++;
          checkCompletion();
        });
      } else {
        insertCount++;
      }

      // Only insert FAHRENHEIT entry if provided
      if (fahrenheit) {
        const fahrenheitQuery = `INSERT INTO EIGHTYFIVETWELVE (INPUT_ID, UNIT, VALUE) 
          VALUES ('${iid}', 'F', '${fahrenheit}')`;

        connection.query(fahrenheitQuery, (err, rows, fields) => {
          if (err) {
            console.log(
              "Failed to insert Fahrenheit into EIGHTYFIVETWELVE: " + err,
            );
            errorOccurred = true;
          }
          insertCount++;
          checkCompletion();
        });
      } else {
        insertCount++;
      }

      function checkCompletion() {
        if (insertCount === 2) {
          try {
            if (connection && connection.end) connection.end();
          } catch {}
          if (errorOccurred) {
            res.sendStatus(500);
          } else {
            res.json({ success: true });
          }
        }
      }
    });
  } catch (err) {
    console.log("Error connecting to Db (acert POST)");
    res.status(500).json({ error: err.message });
  }
});

// ==================================================
// GET 01TE temperature data
router.get("/temp-data/:iid", (req, res) => {
  try {
    const connection = getQualityDbConnection();
    connection.connect(function (err) {
      if (err) {
        console.error("Error connecting: " + err.stack);
        return;
      }

      const iid = req.params.iid;
      const query = `SELECT UNIT, VALUE FROM EIGHTYFIVETWELVE WHERE INPUT_ID = '${iid}'`;

      connection.query(query, (err, rows, fields) => {
        try {
          if (connection && connection.end) connection.end();
        } catch {}
        if (err) {
          console.log("Failed to query EIGHTYFIVETWELVE: " + err);
          res.sendStatus(500);
          return;
        }

        // Transform rows into object with percent and fahrenheit properties
        const result = {
          percent: null,
          fahrenheit: null,
        };

        rows.forEach((row) => {
          if (row.UNIT === "Percent") {
            result.percent = row.VALUE;
          } else if (row.UNIT === "Fahrenheit" || row.UNIT === "F") {
            result.fahrenheit = row.VALUE;
          }
        });

        res.json(result);
      });
    });
  } catch (err) {
    console.log("Error connecting to Db (acert temp-data)");
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
