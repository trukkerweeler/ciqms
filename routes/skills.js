const express = require("express");
const mysql = require("mysql2");
const router = express.Router();

// Database connection function
function getConnection() {
  return mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    port: 3306,
    database: "quality",
  });
}

// Get all active skills
router.get("/", (req, res) => {
  const connection = getConnection();

  connection.connect((err) => {
    if (err) {
      console.error("[skills.js] Database connection error:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    const query = `
      SELECT 
        SKILL_ID,
        NAME,
        CATEGORY,
        STATUS,
        REVISION_LEVEL,
        ISSUE_DATE
      FROM SKILLS
      WHERE STATUS = 'A'
      ORDER BY CATEGORY, NAME
    `;

    connection.query(query, (error, results) => {
      connection.end();

      if (error) {
        console.error("[skills.js] Query error:", error);
        return res.status(500).json({ error: "Failed to fetch skills" });
      }

      console.log("[skills.js] Retrieved", results.length, "skills");
      res.json(results);
    });
  });
});

module.exports = router;
