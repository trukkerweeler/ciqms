// routes/chem-tank.js - Express route for chemical tank trend reporting
const express = require("express");
const mysql = require("mysql2");
const router = express.Router();

/**
 * Get trend data for a specific chemical tank over time
 * Joins PEOPLE_INPUT (action items) with EIGHTYFIVETWELVE (measurement data)
 *
 * Tank Subject Codes: 01TE (Tank 1), 03TE (Tank 3), 05TE (Tank 5), etc.
 */

// Helper to get quality DB connection
function getQualityDbConnection() {
  return mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    port: 3306,
    database: "quality",
  });
}

/**
 * GET /chem-tank/trend-data/:subject
 * Returns trend data for a chemical tank
 *
 * Example: /chem-tank/trend-data/01TE (for Tank 1)
 * Returns: { labels: [...dates], percentData: [...], fahrenheitData: [...] }
 */
router.get("/trend-data/:subject", (req, res) => {
  try {
    const connection = getQualityDbConnection();
    connection.connect(function (err) {
      if (err) {
        console.error("Error connecting: " + err.stack);
        res.status(500).json({ error: "Database connection failed" });
        return;
      }

      const subject = req.params.subject; // e.g., "01TE"

      // Query to get trend data for the last 13 months
      // Joins PEOPLE_INPUT (which has the INPUT_ID and INPUT_DATE)
      // with EIGHTYFIVETWELVE (which has the UNIT and VALUE)
      const query = `
        SELECT 
          pi.INPUT_ID,
          pi.INPUT_DATE,
          et.UNIT,
          et.VALUE
        FROM PEOPLE_INPUT pi
        LEFT JOIN EIGHTYFIVETWELVE et ON pi.INPUT_ID = et.INPUT_ID
        WHERE pi.SUBJECT = ? 
          AND pi.INPUT_DATE >= DATE_FORMAT(NOW(), '%Y-%m-01') - INTERVAL 11 MONTH
        ORDER BY pi.INPUT_DATE ASC
      `;

      connection.query(query, [subject], (err, rows) => {
        try {
          if (connection && connection.end) connection.end();
        } catch {}

        if (err) {
          console.error("Failed to query tank trend data: " + err);
          res.status(500).json({ error: "Query failed" });
          return;
        }

        // Process rows to organize by date and separate percent/fahrenheit values
        const dataByDateMap = {}; // Maps formatted string to { date: Date object, data }

        rows.forEach((row) => {
          const dateObj = row.INPUT_DATE ? new Date(row.INPUT_DATE) : null;
          const dateStr = dateObj ? dateObj.toLocaleDateString("en-US") : null;

          if (dateStr) {
            if (!dataByDateMap[dateStr]) {
              dataByDateMap[dateStr] = {
                date: dateObj, // Keep for chronological sorting
                percent: null,
                fahrenheit: null,
              };
            }

            if (row.UNIT === "Percent") {
              dataByDateMap[dateStr].percent = parseFloat(row.VALUE);
            } else if (row.UNIT === "F" || row.UNIT === "Fahrenheit") {
              dataByDateMap[dateStr].fahrenheit = parseFloat(row.VALUE);
            }
          }
        });

        // Sort by actual date object (chronologically), then extract labels in order
        const sortedEntries = Object.entries(dataByDateMap).sort(
          ([, a], [, b]) => a.date - b.date,
        );

        const labels = sortedEntries.map(([dateStr]) => dateStr);
        const percentData = sortedEntries.map(([, data]) => data.percent);
        const fahrenheitData = sortedEntries.map(([, data]) => data.fahrenheit);

        res.json({
          labels,
          percentData,
          fahrenheitData,
          dataCount: rows.length,
        });
      });
    });
  } catch (err) {
    console.error("Error connecting to database:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET /chem-tank/tank-info/:subject
 * Returns basic info about a chemical tank
 */
router.get("/tank-info/:subject", (req, res) => {
  try {
    const connection = getQualityDbConnection();
    connection.connect(function (err) {
      if (err) {
        console.error("Error connecting: " + err.stack);
        res.status(500).json({ error: "Database connection failed" });
        return;
      }

      const subject = req.params.subject;

      // Get info from PEOPLE_INPUT for this subject
      const query = `
        SELECT 
          SUBJECT,
          COUNT(*) as recordCount,
          MAX(INPUT_DATE) as lastEntry,
          MIN(INPUT_DATE) as firstEntry
        FROM PEOPLE_INPUT
        WHERE SUBJECT = ?
        GROUP BY SUBJECT
      `;

      connection.query(query, [subject], (err, rows) => {
        try {
          if (connection && connection.end) connection.end();
        } catch {}

        if (err) {
          console.error("Failed to query tank info: " + err);
          res.status(500).json({ error: "Query failed" });
          return;
        }

        if (rows.length === 0) {
          res.json({
            subject,
            recordCount: 0,
            lastEntry: null,
            firstEntry: null,
          });
        } else {
          res.json(rows[0]);
        }
      });
    });
  } catch (err) {
    console.error("Error connecting to database:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
