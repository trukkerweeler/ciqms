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

// Get all product characteristic types
router.get("/", (req, res) => {
  const connection = createConnection();

  connection.connect((err) => {
    if (err) {
      console.error("Database connection failed:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    const query =
      "SELECT PRD_CHAR_TYPE, DESCRIPTION FROM PRD_CHAR_TYPE ORDER BY PRD_CHAR_TYPE";

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

// Get single product characteristic type by ID
router.get("/:prd_char_type", (req, res) => {
  const connection = createConnection();
  const prd_char_type = req.params.prd_char_type;

  connection.connect((err) => {
    if (err) {
      console.error("Database connection failed:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    const query =
      "SELECT PRD_CHAR_TYPE, DESCRIPTION FROM PRD_CHAR_TYPE WHERE PRD_CHAR_TYPE = ?";

    connection.query(query, [prd_char_type], (err, results) => {
      connection.end();

      if (err) {
        console.error("Database query failed:", err);
        return res.status(500).json({ error: "Database query failed" });
      }

      if (results.length === 0) {
        return res
          .status(404)
          .json({ error: "Product characteristic type not found" });
      }

      res.json(results[0]);
    });
  });
});

// Create new product characteristic type
router.post("/", (req, res) => {
  const connection = createConnection();
  const { prd_char_type, description } = req.body;

  if (!prd_char_type || prd_char_type.trim() === "") {
    return res
      .status(400)
      .json({ error: "Product characteristic type is required" });
  }

  connection.connect((err) => {
    if (err) {
      console.error("Database connection failed:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    const query =
      "INSERT INTO PRD_CHAR_TYPE (PRD_CHAR_TYPE, DESCRIPTION) VALUES (?, ?)";

    connection.query(
      query,
      [prd_char_type.trim().toUpperCase(), description || ""],
      (err, results) => {
        connection.end();

        if (err) {
          console.error("Database insert failed:", err);
          if (err.code === "ER_DUP_ENTRY") {
            return res
              .status(409)
              .json({ error: "Product characteristic type already exists" });
          }
          return res
            .status(500)
            .json({ error: "Failed to create product characteristic type" });
        }

        res.status(201).json({
          message: "Product characteristic type created successfully",
          prd_char_type: prd_char_type.trim().toUpperCase(),
        });
      },
    );
  });
});

// Update existing product characteristic type
router.put("/:prd_char_type", (req, res) => {
  const connection = createConnection();
  const originalPrdCharType = req.params.prd_char_type;
  const { description } = req.body;

  connection.connect((err) => {
    if (err) {
      console.error("Database connection failed:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    const query =
      "UPDATE PRD_CHAR_TYPE SET DESCRIPTION = ? WHERE PRD_CHAR_TYPE = ?";

    connection.query(
      query,
      [description || "", originalPrdCharType],
      (err, results) => {
        connection.end();

        if (err) {
          console.error("Database update failed:", err);
          return res
            .status(500)
            .json({ error: "Failed to update product characteristic type" });
        }

        if (results.affectedRows === 0) {
          return res
            .status(404)
            .json({ error: "Product characteristic type not found" });
        }

        res.json({
          message: "Product characteristic type updated successfully",
          prd_char_type: originalPrdCharType,
        });
      },
    );
  });
});

// Delete product characteristic type
router.delete("/:prd_char_type", (req, res) => {
  const connection = createConnection();
  const prd_char_type = req.params.prd_char_type;

  connection.connect((err) => {
    if (err) {
      console.error("Database connection failed:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    const query = "DELETE FROM PRD_CHAR_TYPE WHERE PRD_CHAR_TYPE = ?";

    connection.query(query, [prd_char_type], (err, results) => {
      connection.end();

      if (err) {
        console.error("Database delete failed:", err);
        return res
          .status(500)
          .json({ error: "Failed to delete product characteristic type" });
      }

      if (results.affectedRows === 0) {
        return res
          .status(404)
          .json({ error: "Product characteristic type not found" });
      }

      res.json({
        message: "Product characteristic type deleted successfully",
        prd_char_type: prd_char_type,
      });
    });
  });
});

module.exports = router;
