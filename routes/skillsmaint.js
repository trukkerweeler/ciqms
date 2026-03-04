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

// Get all skills
router.get("/", (req, res) => {
  const connection = getConnection();

  connection.connect((err) => {
    if (err) {
      console.error("[skillsmaint.js] Database connection error:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    const query = `
      SELECT 
        SKILL_ID,
        NAME,
        CATEGORY,
        STATUS,
        REVISION_LEVEL,
        ISSUE_DATE,
        CREATE_BY,
        CREATED_DATE,
        MODIFIED_BY,
        MODIFIED_DATE
      FROM SKILLS
      ORDER BY CATEGORY, NAME
    `;

    connection.query(query, (error, results) => {
      connection.end();

      if (error) {
        console.error("[skillsmaint.js] Query error:", error);
        return res.status(500).json({ error: "Failed to fetch skills" });
      }

      console.log("[skillsmaint.js] Retrieved", results.length, "skills");
      res.json(results);
    });
  });
});

// Create a new skill
router.post("/", (req, res) => {
  const connection = getConnection();
  const {
    SKILL_ID,
    NAME,
    CATEGORY,
    STATUS,
    REVISION_LEVEL,
    CREATE_BY,
    CREATED_DATE,
  } = req.body;

  if (!SKILL_ID || !NAME || !CATEGORY) {
    return res.status(400).json({
      error: "SKILL_ID, NAME, and CATEGORY are required",
    });
  }

  connection.connect((err) => {
    if (err) {
      console.error("[skillsmaint.js] Database connection error:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    const query = `
      INSERT INTO SKILLS 
      (SKILL_ID, NAME, CATEGORY, STATUS, REVISION_LEVEL, CREATE_BY, CREATED_DATE)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      SKILL_ID,
      NAME,
      CATEGORY,
      STATUS || "A",
      REVISION_LEVEL || null,
      CREATE_BY || "System",
      CREATED_DATE || new Date().toISOString().slice(0, 19).replace("T", " "),
    ];

    connection.query(query, values, (error, results) => {
      connection.end();

      if (error) {
        console.error("[skillsmaint.js] Insert error:", error);
        return res
          .status(500)
          .json({ error: "Failed to create skill", details: error.message });
      }

      console.log("[skillsmaint.js] Created skill with ID:", SKILL_ID);
      res.json({
        SKILL_ID,
        NAME,
        CATEGORY,
        STATUS: STATUS || "A",
        REVISION_LEVEL,
        CREATE_BY,
        CREATED_DATE,
      });
    });
  });
});

// Update a skill
router.put("/", (req, res) => {
  const connection = getConnection();
  const {
    SKILL_ID,
    NAME,
    CATEGORY,
    STATUS,
    REVISION_LEVEL,
    MODIFIED_BY,
    MODIFIED_DATE,
  } = req.body;

  if (!SKILL_ID || !NAME || !CATEGORY) {
    return res.status(400).json({
      error: "SKILL_ID, NAME, and CATEGORY are required",
    });
  }

  connection.connect((err) => {
    if (err) {
      console.error("[skillsmaint.js] Database connection error:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    const query = `
      UPDATE SKILLS 
      SET NAME = ?, CATEGORY = ?, STATUS = ?, REVISION_LEVEL = ?, MODIFIED_BY = ?, MODIFIED_DATE = ?
      WHERE SKILL_ID = ?
    `;

    const values = [
      NAME,
      CATEGORY,
      STATUS || "A",
      REVISION_LEVEL || null,
      MODIFIED_BY || "System",
      MODIFIED_DATE || new Date().toISOString().slice(0, 19).replace("T", " "),
      SKILL_ID,
    ];

    connection.query(query, values, (error, results) => {
      connection.end();

      if (error) {
        console.error("[skillsmaint.js] Update error:", error);
        return res.status(500).json({ error: "Failed to update skill" });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({ error: "Skill not found" });
      }

      console.log("[skillsmaint.js] Updated skill with ID:", SKILL_ID);
      res.json({ message: "Skill updated successfully" });
    });
  });
});

// Delete a skill (soft delete - set status to 'I')
router.delete("/:id", (req, res) => {
  const connection = getConnection();
  const { id } = req.params;

  connection.connect((err) => {
    if (err) {
      console.error("[skillsmaint.js] Database connection error:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    const query = `
      UPDATE SKILLS 
      SET STATUS = 'I'
      WHERE SKILL_ID = ?
    `;

    connection.query(query, [id], (error, results) => {
      connection.end();

      if (error) {
        console.error("[skillsmaint.js] Delete error:", error);
        return res.status(500).json({ error: "Failed to delete skill" });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({ error: "Skill not found" });
      }

      console.log("[skillsmaint.js] Deleted skill with ID:", id);
      res.json({ message: "Skill deleted successfully" });
    });
  });
});

module.exports = router;
