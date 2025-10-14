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

// Get all opcodes
router.get("/", (req, res) => {
  const connection = createConnection();

  connection.connect((err) => {
    if (err) {
      console.error("Database connection failed:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    const query =
      "SELECT OPCODE, DESCRIPTION, COMMENTS FROM OPCODE ORDER BY OPCODE";

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

// Get single opcode by ID
router.get("/:opcode", (req, res) => {
  const connection = createConnection();
  const opcode = req.params.opcode;

  connection.connect((err) => {
    if (err) {
      console.error("Database connection failed:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    const query =
      "SELECT OPCODE, DESCRIPTION, COMMENTS FROM OPCODE WHERE OPCODE = ?";

    connection.query(query, [opcode], (err, results) => {
      connection.end();

      if (err) {
        console.error("Database query failed:", err);
        return res.status(500).json({ error: "Database query failed" });
      }

      if (results.length === 0) {
        return res.status(404).json({ error: "OP code not found" });
      }

      res.json(results[0]);
    });
  });
});

// Create new opcode
router.post("/", (req, res) => {
  const connection = createConnection();
  const { opcode, description, comments } = req.body;

  if (!opcode || opcode.trim() === "") {
    return res.status(400).json({ error: "OP code is required" });
  }

  connection.connect((err) => {
    if (err) {
      console.error("Database connection failed:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    const query =
      "INSERT INTO OPCODE (OPCODE, DESCRIPTION, COMMENTS) VALUES (?, ?, ?)";

    connection.query(
      query,
      [opcode.trim().toUpperCase(), description || "", comments || ""],
      (err, results) => {
        connection.end();

        if (err) {
          console.error("Database insert failed:", err);
          if (err.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ error: "OP code already exists" });
          }
          return res.status(500).json({ error: "Failed to create OP code" });
        }

        res.status(201).json({
          message: "OP code created successfully",
          opcode: opcode.trim().toUpperCase(),
        });
      }
    );
  });
});

// Update existing opcode
router.put("/:opcode", (req, res) => {
  const connection = createConnection();
  const originalOpcode = req.params.opcode;
  const { description, comments } = req.body;

  connection.connect((err) => {
    if (err) {
      console.error("Database connection failed:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    const query =
      "UPDATE OPCODE SET DESCRIPTION = ?, COMMENTS = ? WHERE OPCODE = ?";

    connection.query(
      query,
      [description || "", comments || "", originalOpcode],
      (err, results) => {
        connection.end();

        if (err) {
          console.error("Database update failed:", err);
          return res.status(500).json({ error: "Failed to update OP code" });
        }

        if (results.affectedRows === 0) {
          return res.status(404).json({ error: "OP code not found" });
        }

        res.json({
          message: "OP code updated successfully",
          opcode: originalOpcode,
        });
      }
    );
  });
});

// Delete opcode
router.delete("/:opcode", (req, res) => {
  const connection = createConnection();
  const opcode = req.params.opcode;

  connection.connect((err) => {
    if (err) {
      console.error("Database connection failed:", err);
      return res.status(500).json({ error: "Database connection failed" });
    }

    const query = "DELETE FROM OPCODE WHERE OPCODE = ?";

    connection.query(query, [opcode], (err, results) => {
      connection.end();

      if (err) {
        console.error("Database delete failed:", err);
        return res.status(500).json({ error: "Failed to delete OP code" });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({ error: "OP code not found" });
      }

      res.json({
        message: "OP code deleted successfully",
        opcode: opcode,
      });
    });
  });
});

module.exports = router;
