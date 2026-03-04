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

// Get all job skills with skill details
router.get("/", (req, res) => {
  const connection = getConnection();

  connection.connect((err) => {
    if (err) {
      console.error("[ctajobskills.js] Database connection error:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    const query = `
      SELECT 
        js.JOB_SKILL_ID,
        js.JOB_TITLE,
        js.SKILL_ID,
        s.NAME as SKILL_NAME,
        s.CATEGORY,
        js.REQUIRED_LEVEL,
        js.CREATED_BY,
        js.CREATED_DATE
      FROM JOB_SKILLS js
      LEFT JOIN SKILLS s ON js.SKILL_ID = s.SKILL_ID
      ORDER BY js.JOB_TITLE, s.NAME
    `;

    connection.query(query, (error, results) => {
      connection.end();

      if (error) {
        console.error("[ctajobskills.js] Query error:", error);
        return res.status(500).json({ error: "Failed to fetch job skills" });
      }

      console.log("[ctajobskills.js] Retrieved", results.length, "job skills");
      res.json(results);
    });
  });
});

// Create a new job skill assignment
router.post("/", (req, res) => {
  const connection = getConnection();
  const { JOB_TITLE, SKILL_ID, REQUIRED_LEVEL, CREATED_BY, CREATED_DATE } =
    req.body;

  if (!JOB_TITLE || !SKILL_ID) {
    return res
      .status(400)
      .json({ error: "JOB_TITLE and SKILL_ID are required" });
  }

  connection.connect((err) => {
    if (err) {
      console.error("[ctajobskills.js] Database connection error:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    const query = `
      INSERT INTO JOB_SKILLS 
      (JOB_TITLE, SKILL_ID, REQUIRED_LEVEL, CREATED_BY, CREATED_DATE)
      VALUES (?, ?, ?, ?, ?)
    `;

    const values = [
      JOB_TITLE,
      SKILL_ID,
      REQUIRED_LEVEL || null,
      CREATED_BY || "System",
      CREATED_DATE || new Date().toISOString().slice(0, 19).replace("T", " "),
    ];

    connection.query(query, values, (error, results) => {
      connection.end();

      if (error) {
        console.error("[ctajobskills.js] Insert error:", error);
        return res.status(500).json({ error: "Failed to assign skill to job" });
      }

      console.log(
        "[ctajobskills.js] Created job skill with ID:",
        results.insertId,
      );
      res.json({
        JOB_SKILL_ID: results.insertId,
        JOB_TITLE,
        SKILL_ID,
        REQUIRED_LEVEL,
        CREATED_BY,
        CREATED_DATE,
      });
    });
  });
});

// Delete a job skill assignment
router.delete("/:id", (req, res) => {
  const connection = getConnection();
  const { id } = req.params;

  connection.connect((err) => {
    if (err) {
      console.error("[ctajobskills.js] Database connection error:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    const query = "DELETE FROM JOB_SKILLS WHERE JOB_SKILL_ID = ?";

    connection.query(query, [id], (error, results) => {
      connection.end();

      if (error) {
        console.error("[ctajobskills.js] Delete error:", error);
        return res.status(500).json({ error: "Failed to delete job skill" });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({ error: "Job skill not found" });
      }

      console.log("[ctajobskills.js] Deleted job skill with ID:", id);
      res.json({ message: "Job skill deleted successfully" });
    });
  });
});

module.exports = router;
