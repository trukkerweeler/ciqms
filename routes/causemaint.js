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

// GET all causes - Read operation
router.get("/", (req, res) => {
  const connection = createConnection();

  connection.connect((err) => {
    if (err) {
      console.error("Database connection error:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    const query = "SELECT CAUSE, DESCRIPTION FROM CAUSE ORDER BY CAUSE";

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

// POST new cause - Create operation
router.post("/", (req, res) => {
  const { CAUSE, DESCRIPTION } = req.body;

  if (!CAUSE || !DESCRIPTION) {
    return res
      .status(400)
      .json({ error: "CAUSE and DESCRIPTION are required" });
  }

  const connection = createConnection();

  connection.connect((err) => {
    if (err) {
      console.error("Database connection error:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    const query = "INSERT INTO CAUSE (CAUSE, DESCRIPTION) VALUES (?, ?)";

    connection.query(
      query,
      [CAUSE.toUpperCase(), DESCRIPTION],
      (err, results) => {
        connection.end();

        if (err) {
          if (err.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ error: "Cause code already exists" });
          }
          console.error("Query error:", err);
          return res.status(500).json({ error: "Database query failed" });
        }

        res.status(201).json({
          message: "Cause created successfully",
          CAUSE: CAUSE.toUpperCase(),
          DESCRIPTION: DESCRIPTION,
        });
      }
    );
  });
});

// PUT update cause - Update operation
router.put("/:cause", (req, res) => {
  const causeCode = req.params.cause;
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

    const query = "UPDATE CAUSE SET DESCRIPTION = ? WHERE CAUSE = ?";

    connection.query(query, [DESCRIPTION, causeCode], (err, results) => {
      connection.end();

      if (err) {
        console.error("Query error:", err);
        return res.status(500).json({ error: "Database query failed" });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({ error: "Cause not found" });
      }

      res.json({
        message: "Cause updated successfully",
        CAUSE: causeCode,
        DESCRIPTION: DESCRIPTION,
      });
    });
  });
});

// DELETE cause - Delete operation
router.delete("/:cause", (req, res) => {
  const causeCode = req.params.cause;

  const connection = createConnection();

  connection.connect((err) => {
    if (err) {
      console.error("Database connection error:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    // First check if cause is in use (check in corrective actions table if it exists)
    const checkQuery =
      "SELECT COUNT(*) as count FROM CORRECTIVE WHERE CAUSE_TEXT LIKE ?";

    connection.query(checkQuery, [`%${causeCode}%`], (err, results) => {
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
            error:
              "Cannot delete cause - it may be in use by corrective actions",
          });
      }

      // If not in use, proceed with deletion
      const deleteQuery = "DELETE FROM CAUSE WHERE CAUSE = ?";

      connection.query(deleteQuery, [causeCode], (err, results) => {
        connection.end();

        if (err) {
          console.error("Delete query error:", err);
          return res.status(500).json({ error: "Database query failed" });
        }

        if (results.affectedRows === 0) {
          return res.status(404).json({ error: "Cause not found" });
        }

        res.json({ message: "Cause deleted successfully" });
      });
    });
  });
});

module.exports = router;
