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

// Get finding counts by type
router.get("/counts", (req, res) => {
  const connection = createConnection();
  const year = req.query.year || new Date().getFullYear();

  connection.connect((err) => {
    if (err) {
      console.error("Database connection failed:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    const query = `
      SELECT 
        finding_type,
        COUNT(DISTINCT finding_code) as count
      FROM V_AUDIT_FINDINGS
      WHERE YEAR(SCHEDULED_DATE) = ?
      GROUP BY finding_type
    `;

    connection.query(query, [year], (err, results) => {
      connection.end();

      if (err) {
        console.error("Database query failed:", err);
        return res.status(500).json({ error: "Database query failed" });
      }

      const counts = {
        total: 0,
        CAR: 0,
        OFI: 0,
        DCR: 0,
      };

      results.forEach((row) => {
        counts[row.finding_type] = row.count;
        counts.total += row.count;
      });

      res.json(counts);
    });
  });
});

// Get findings grouped by clause (REFERENCE)
router.get("/by-clause", (req, res) => {
  const connection = createConnection();
  const year = req.query.year || new Date().getFullYear();

  connection.connect((err) => {
    if (err) {
      console.error("Database connection failed:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    const query = `
      SELECT 
        REFERENCE as clause,
        COUNT(DISTINCT finding_code) as total,
        SUM(CASE WHEN finding_type = 'CAR' THEN 1 ELSE 0 END) as car_count,
        SUM(CASE WHEN finding_type = 'OFI' THEN 1 ELSE 0 END) as ofi_count,
        SUM(CASE WHEN finding_type = 'DCR' THEN 1 ELSE 0 END) as dcr_count
      FROM V_AUDIT_FINDINGS
      WHERE YEAR(SCHEDULED_DATE) = ?
      GROUP BY REFERENCE
      ORDER BY total DESC
    `;

    connection.query(query, [year], (err, results) => {
      connection.end();

      if (err) {
        console.error("Database query failed:", err);
        return res.status(500).json({ error: "Database query failed" });
      }

      res.json(results);
    });
  });
});

// Get repeat findings (clauses in multiple audits)
router.get("/repeat-findings", (req, res) => {
  const connection = createConnection();
  const year = req.query.year || new Date().getFullYear();

  connection.connect((err) => {
    if (err) {
      console.error("Database connection failed:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    const query = `
      SELECT 
        REFERENCE as clause,
        COUNT(DISTINCT SCHEDULED_DATE) as occurrences,
        COUNT(DISTINCT finding_code) as finding_count
      FROM V_AUDIT_FINDINGS
      WHERE YEAR(SCHEDULED_DATE) = ?
      GROUP BY REFERENCE
      HAVING COUNT(DISTINCT SCHEDULED_DATE) > 1
      ORDER BY occurrences DESC
    `;

    connection.query(query, [year], (err, results) => {
      connection.end();

      if (err) {
        console.error("Database query failed:", err);
        return res.status(500).json({ error: "Database query failed" });
      }

      res.json(results);
    });
  });
});

// Get all findings with optional filters
router.get("/findings", (req, res) => {
  const connection = createConnection();
  const year = req.query.year || new Date().getFullYear();
  const subject = req.query.subject || null;
  const clause = req.query.clause || null;

  connection.connect((err) => {
    if (err) {
      console.error("Database connection failed:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    let query = `
      SELECT 
        SCHEDULED_DATE,
        SUBJECT,
        REFERENCE,
        finding_type,
        finding_code,
        OBSERVATION
      FROM V_AUDIT_FINDINGS
      WHERE YEAR(SCHEDULED_DATE) = ?
    `;

    const params = [year];

    if (subject) {
      query += ` AND SUBJECT = ?`;
      params.push(subject);
    }

    if (clause) {
      query += ` AND REFERENCE = ?`;
      params.push(clause);
    }

    query += ` ORDER BY SCHEDULED_DATE DESC`;

    connection.query(query, params, (err, results) => {
      connection.end();

      if (err) {
        console.error("Database query failed:", err);
        return res.status(500).json({ error: "Database query failed" });
      }

      res.json(results);
    });
  });
});

// Get distinct subjects for filter dropdown
router.get("/subjects", (req, res) => {
  const connection = createConnection();
  const year = req.query.year || new Date().getFullYear();

  connection.connect((err) => {
    if (err) {
      console.error("Database connection failed:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    const query = `
      SELECT DISTINCT SUBJECT
      FROM V_AUDIT_FINDINGS
      WHERE YEAR(SCHEDULED_DATE) = ?
      ORDER BY SUBJECT
    `;

    connection.query(query, [year], (err, results) => {
      connection.end();

      if (err) {
        console.error("Database query failed:", err);
        return res.status(500).json({ error: "Database query failed" });
      }

      res.json(results.map((row) => row.SUBJECT));
    });
  });
});

// Get distinct clauses for filter dropdown
router.get("/clauses", (req, res) => {
  const connection = createConnection();
  const year = req.query.year || new Date().getFullYear();

  connection.connect((err) => {
    if (err) {
      console.error("Database connection failed:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    const query = `
      SELECT DISTINCT REFERENCE
      FROM V_AUDIT_FINDINGS
      WHERE YEAR(SCHEDULED_DATE) = ?
      ORDER BY REFERENCE
    `;

    connection.query(query, [year], (err, results) => {
      connection.end();

      if (err) {
        console.error("Database query failed:", err);
        return res.status(500).json({ error: "Database query failed" });
      }

      res.json(results.map((row) => row.REFERENCE));
    });
  });
});

module.exports = router;
