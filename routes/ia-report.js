const express = require("express");
const mysql = require("mysql2");
const router = express.Router();

// Database connection function
function createConnection() {
  return mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    port: 3306,
    database: "quality",
  });
}

// Get IA age at closure data
// Returns array of days_to_closure values for closed audits
router.get("/age-at-closure", (req, res) => {
  const connection = createConnection();

  connection.connect((err) => {
    if (err) {
      console.error("Database connection failed:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    // Get all audit records - we'll filter valid dates in the app
    const query = `
      SELECT 
        AUDIT_MANAGER_ID,
        SCHEDULED_DATE,
        COMPLETION_DATE
      FROM AUDIT_MANAGER
    `;

    connection.query(query, (err, results) => {
      connection.end();

      if (err) {
        console.error("Database query failed:", err.message);
        return res
          .status(500)
          .json({ error: "Database query failed", details: err.message });
      }

      // Filter and calculate days difference in JavaScript
      const daysArray = results
        .map((row) => {
          // Skip if either date is null, empty, or not a valid date
          if (!row.SCHEDULED_DATE || !row.COMPLETION_DATE) {
            return null;
          }

          const scheduled = new Date(row.SCHEDULED_DATE);
          const completed = new Date(row.COMPLETION_DATE);

          // Skip if dates are invalid
          if (
            isNaN(scheduled.getTime()) ||
            isNaN(completed.getTime()) ||
            scheduled.getTime() === 0 ||
            completed.getTime() === 0
          ) {
            return null;
          }

          // Only count if audit is completed (completion date is after scheduled date)
          if (completed <= scheduled) {
            return null;
          }

          const diffTime = completed - scheduled;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return diffDays;
        })
        .filter((val) => val !== null && !isNaN(val) && val >= 0);

      res.json(daysArray);
    });
  });
});

// Get YoY findings count (CAR, OFI, DCR) for previous 2 calendar years
// Returns data grouped by year and finding type
router.get("/yoy-findings", (req, res) => {
  const connection = createConnection();

  connection.connect((err) => {
    if (err) {
      console.error("Database connection failed:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    // Get current year and previous year
    // For previous 2 calendar years
    const currentYear = new Date().getFullYear();
    const previousYear = currentYear - 1;
    const twoYearsAgo = currentYear - 2;

    // Query to get findings counts by year and type from V_AUDIT_FINDINGS
    const query = `
      SELECT 
        YEAR(SCHEDULED_DATE) as year,
        finding_type,
        COUNT(*) as count
      FROM V_AUDIT_FINDINGS
      WHERE YEAR(SCHEDULED_DATE) IN (?, ?)
        AND SCHEDULED_DATE IS NOT NULL
      GROUP BY YEAR(SCHEDULED_DATE), finding_type
      ORDER BY year ASC, finding_type ASC
    `;

    connection.query(query, [previousYear, twoYearsAgo], (err, results) => {
      connection.end();

      if (err) {
        console.error("Database query failed:", err);
        return res.status(500).json({ error: "Database query failed" });
      }

      // Transform results into chart-friendly format
      // Group by year and type
      const dataMap = {};

      results.forEach((row) => {
        if (!dataMap[row.year]) {
          dataMap[row.year] = {
            year: row.year,
            CAR: 0,
            OFI: 0,
            DCR: 0,
          };
        }
        if (
          row.finding_type &&
          dataMap[row.year].hasOwnProperty(row.finding_type)
        ) {
          dataMap[row.year][row.finding_type] = row.count;
        }
      });

      // Convert to array and sort by year
      const yoyData = Object.values(dataMap).sort((a, b) => a.year - b.year);

      res.json(yoyData);
    });
  });
});

module.exports = router;
