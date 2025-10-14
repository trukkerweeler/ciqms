const express = require("express");
const mysql = require("mysql2");
const router = express.Router();

// Database connection helper
function createConnection() {
  return mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    port: 3306,
    database: "quality",
  });
}

// GET all subjects - Read operation
router.get("/", (req, res) => {
  const connection = createConnection();

  connection.connect((err) => {
    if (err) {
      console.error("Database connection error:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    const query = "SELECT SUBJECT, DESCRIPTION FROM SUBJECT ORDER BY SUBJECT";

    connection.query(query, (err, results) => {
      connection.end();

      if (err) {
        console.error("Query error:", err);
        return res.status(500).json({ error: "Database query failed" });
      }

      res.json(results);
    });
  });
});

// POST new subject - Create operation
router.post("/", (req, res) => {
  const { SUBJECT, DESCRIPTION } = req.body;

  if (!SUBJECT || !DESCRIPTION) {
    return res
      .status(400)
      .json({ error: "SUBJECT and DESCRIPTION are required" });
  }

  const connection = createConnection();

  connection.connect((err) => {
    if (err) {
      console.error("Database connection error:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    const query = "INSERT INTO SUBJECT (SUBJECT, DESCRIPTION) VALUES (?, ?)";

    connection.query(
      query,
      [SUBJECT.toUpperCase(), DESCRIPTION],
      (err, results) => {
        connection.end();

        if (err) {
          if (err.code === "ER_DUP_ENTRY") {
            return res
              .status(409)
              .json({ error: "Subject code already exists" });
          }
          console.error("Query error:", err);
          return res.status(500).json({ error: "Database query failed" });
        }

        res.status(201).json({
          message: "Subject created successfully",
          SUBJECT: SUBJECT.toUpperCase(),
          DESCRIPTION: DESCRIPTION,
        });
      }
    );
  });
});

// PUT update subject - Update operation
router.put("/:subject", (req, res) => {
  const subjectCode = req.params.subject;
  const { DESCRIPTION } = req.body;

  if (!DESCRIPTION) {
    return res.status(400).json({ error: "DESCRIPTION is required" });
  }

  const connection = createConnection();

  connection.connect((err) => {
    if (err) {
      console.error("Database connection error:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    const query = "UPDATE SUBJECT SET DESCRIPTION = ? WHERE SUBJECT = ?";

    connection.query(query, [DESCRIPTION, subjectCode], (err, results) => {
      connection.end();

      if (err) {
        console.error("Query error:", err);
        return res.status(500).json({ error: "Database query failed" });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({ error: "Subject not found" });
      }

      res.json({
        message: "Subject updated successfully",
        SUBJECT: subjectCode,
        DESCRIPTION: DESCRIPTION,
      });
    });
  });
});

// DELETE subject - Delete operation
router.delete("/:subject", (req, res) => {
  const subjectCode = req.params.subject;

  const connection = createConnection();

  connection.connect((err) => {
    if (err) {
      console.error("Database connection error:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    // First check if subject is in use
    const checkQuery =
      "SELECT COUNT(*) as count FROM NONCONFORMANCES WHERE SUBJECT = ?";

    connection.query(checkQuery, [subjectCode], (err, results) => {
      if (err) {
        connection.end();
        console.error("Check query error:", err);
        return res.status(500).json({ error: "Database query failed" });
      }

      if (results[0].count > 0) {
        connection.end();
        return res
          .status(409)
          .json({
            error: "Cannot delete subject - it is in use by nonconformances",
          });
      }

      // If not in use, proceed with deletion
      const deleteQuery = "DELETE FROM SUBJECT WHERE SUBJECT = ?";

      connection.query(deleteQuery, [subjectCode], (err, results) => {
        connection.end();

        if (err) {
          console.error("Delete query error:", err);
          return res.status(500).json({ error: "Database query failed" });
        }

        if (results.affectedRows === 0) {
          return res.status(404).json({ error: "Subject not found" });
        }

        res.json({ message: "Subject deleted successfully" });
      });
    });
  });
});

module.exports = router;
