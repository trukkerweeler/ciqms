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

// Get all input types
router.get("/", (req, res) => {
  const connection = createConnection();

  connection.connect((err) => {
    if (err) {
      console.error("Database connection failed:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    const query =
      "SELECT INPUT_TYPE, DESCRIPTION FROM INPUT_TYPE ORDER BY INPUT_TYPE";

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

// Get single input type by ID
router.get("/:input_type", (req, res) => {
  const connection = createConnection();
  const input_type = req.params.input_type;

  connection.connect((err) => {
    if (err) {
      console.error("Database connection failed:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    const query =
      "SELECT INPUT_TYPE, DESCRIPTION FROM INPUT_TYPE WHERE INPUT_TYPE = ?";

    connection.query(query, [input_type], (err, results) => {
      connection.end();

      if (err) {
        console.error("Database query failed:", err);
        return res.status(500).json({ error: "Database query failed" });
      }

      if (results.length === 0) {
        return res.status(404).json({ error: "Input type not found" });
      }

      res.json(results[0]);
    });
  });
});

// Create new input type
router.post("/", (req, res) => {
  const connection = createConnection();
  const { input_type, description } = req.body;

  if (!input_type || input_type.trim() === "") {
    return res.status(400).json({ error: "Input type is required" });
  }

  connection.connect((err) => {
    if (err) {
      console.error("Database connection failed:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    const query =
      "INSERT INTO INPUT_TYPE (INPUT_TYPE, DESCRIPTION) VALUES (?, ?)";

    connection.query(
      query,
      [input_type.trim().toUpperCase(), description || ""],
      (err, results) => {
        connection.end();

        if (err) {
          console.error("Database insert failed:", err);
          if (err.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ error: "Input type already exists" });
          }
          return res.status(500).json({ error: "Failed to create input type" });
        }

        res.status(201).json({
          message: "Input type created successfully",
          INPUT_TYPE: input_type.trim().toUpperCase(),
        });
      },
    );
  });
});

// Update existing input type
router.put("/:input_type", (req, res) => {
  const connection = createConnection();
  const originalInputType = req.params.input_type;
  const { description } = req.body;

  connection.connect((err) => {
    if (err) {
      console.error("Database connection failed:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    const query = "UPDATE INPUT_TYPE SET DESCRIPTION = ? WHERE INPUT_TYPE = ?";

    connection.query(
      query,
      [description || "", originalInputType],
      (err, results) => {
        connection.end();

        if (err) {
          console.error("Database update failed:", err);
          return res.status(500).json({ error: "Failed to update input type" });
        }

        if (results.affectedRows === 0) {
          return res.status(404).json({ error: "Input type not found" });
        }

        res.json({
          message: "Input type updated successfully",
          INPUT_TYPE: originalInputType,
        });
      },
    );
  });
});

// Delete input type
router.delete("/:input_type", (req, res) => {
  const connection = createConnection();
  const input_type = req.params.input_type;

  connection.connect((err) => {
    if (err) {
      console.error("Database connection failed:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    const query = "DELETE FROM INPUT_TYPE WHERE INPUT_TYPE = ?";

    connection.query(query, [input_type], (err, results) => {
      connection.end();

      if (err) {
        console.error("Database delete failed:", err);
        return res.status(500).json({ error: "Failed to delete input type" });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({ error: "Input type not found" });
      }

      res.json({
        message: "Input type deleted successfully",
        INPUT_TYPE: input_type,
      });
    });
  });
});

module.exports = router;
