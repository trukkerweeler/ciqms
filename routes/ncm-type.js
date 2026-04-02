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

// Get all NCM types
router.get("/", (req, res) => {
  const connection = createConnection();

  connection.connect((err) => {
    if (err) {
      console.error("Database connection failed:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    const query =
      "SELECT NCM_TYPE, DESCRIPTION FROM NCM_TYPE ORDER BY NCM_TYPE";

    connection.query(query, (err, results) => {
      connection.end();

      if (err) {
        console.error("Database query failed:", err);
        return res.status(500).json({ error: "Database query failed" });
      }

      res.json(results);
    });
  });
});

// Create new NCM type
router.post("/", (req, res) => {
  const connection = createConnection();
  const ncmType = (req.body.ncm_type || "").trim().toUpperCase();
  const description = (req.body.description || "").trim();

  if (!ncmType) {
    connection.end();
    return res.status(400).json({ error: "NCM Type is required" });
  }

  if (ncmType.length > 16) {
    connection.end();
    return res
      .status(400)
      .json({ error: "NCM Type cannot exceed 16 characters" });
  }

  connection.connect((err) => {
    if (err) {
      console.error("Database connection failed:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    const query = "INSERT INTO NCM_TYPE (NCM_TYPE, DESCRIPTION) VALUES (?, ?)";

    connection.query(query, [ncmType, description || null], (err) => {
      connection.end();

      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(400).json({ error: "NCM Type already exists" });
        }
        console.error("Database query failed:", err);
        return res.status(500).json({ error: "Failed to create NCM type" });
      }

      res.status(201).json({ message: "NCM type created successfully" });
    });
  });
});

// Get single NCM type by ID
router.get("/:ncmType", (req, res) => {
  const connection = createConnection();
  const ncmType = req.params.ncmType;

  connection.connect((err) => {
    if (err) {
      console.error("Database connection failed:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    const query =
      "SELECT NCM_TYPE, DESCRIPTION FROM NCM_TYPE WHERE NCM_TYPE = ?";

    connection.query(query, [ncmType], (err, results) => {
      connection.end();

      if (err) {
        console.error("Database query failed:", err);
        return res.status(500).json({ error: "Database query failed" });
      }

      if (!results || results.length === 0) {
        return res.status(404).json({ error: "NCM type not found" });
      }

      res.json(results[0]);
    });
  });
});

// Update NCM type
router.put("/:ncmType", (req, res) => {
  const connection = createConnection();
  const ncmType = req.params.ncmType;
  const description = (req.body.description || "").trim();

  connection.connect((err) => {
    if (err) {
      console.error("Database connection failed:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    const query = "UPDATE NCM_TYPE SET DESCRIPTION = ? WHERE NCM_TYPE = ?";

    connection.query(query, [description || null, ncmType], (err, result) => {
      connection.end();

      if (err) {
        console.error("Database query failed:", err);
        return res.status(500).json({ error: "Failed to update NCM type" });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "NCM type not found" });
      }

      res.json({ message: "NCM type updated successfully" });
    });
  });
});

// Delete NCM type
router.delete("/:ncmType", (req, res) => {
  const connection = createConnection();
  const ncmType = req.params.ncmType;

  connection.connect((err) => {
    if (err) {
      console.error("Database connection failed:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    const query = "DELETE FROM NCM_TYPE WHERE NCM_TYPE = ?";

    connection.query(query, [ncmType], (err, result) => {
      connection.end();

      if (err) {
        console.error("Database query failed:", err);
        return res.status(500).json({ error: "Failed to delete NCM type" });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "NCM type not found" });
      }

      res.json({ message: "NCM type deleted successfully" });
    });
  });
});

module.exports = router;
