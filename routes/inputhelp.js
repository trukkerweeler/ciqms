const express = require("express");
const router = express.Router();
const mysql = require("mysql2");

// ==================================================
// Get all help records
router.get("/", (req, res) => {
  try {
    const connection = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      port: 3306,
      database: "quality",
    });
    connection.connect(function (err) {
      if (err) {
        console.error("Error connecting: " + err.stack);
        res.status(500).json({ error: "Database connection failed" });
        return;
      }

      const query = `SELECT SUBJECT, DESCRIPTION, LINK FROM PPL_INPT_HELP ORDER BY SUBJECT ASC`;

      connection.query(query, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for input help: " + err);
          connection.end();
          res.status(500).json({ error: "Failed to query input help data" });
          return;
        }
        connection.end();
        res.json(rows);
      });
    });
  } catch (err) {
    console.log("Error connecting to Db");
    res.status(500).json({ error: "Server error" });
  }
});

// ==================================================
// Create a new help record
router.post("/", (req, res) => {
  try {
    const connection = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      port: 3306,
      database: "quality",
    });

    connection.connect(function (err) {
      if (err) {
        console.error("Error connecting: " + err.stack);
        res.status(500).json({ error: "Database connection failed" });
        return;
      }

      const query = `INSERT INTO PPL_INPT_HELP (SUBJECT, DESCRIPTION, LINK) VALUES (?, ?, ?)`;

      const values = [req.body.SUBJECT, req.body.DESCRIPTION, req.body.LINK];

      connection.query(query, values, (err, result) => {
        if (err) {
          console.log("Failed to insert input help: " + err);
          connection.end();
          res.status(500).json({ error: "Failed to insert input help" });
          return;
        }

        connection.end();
        res.json({
          success: true,
          message: "Input help record created successfully",
        });
      });
    });
  } catch (err) {
    console.log("Error in POST /inputhelp: ", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ==================================================
// Update a help record
router.put("/", (req, res) => {
  try {
    const { SUBJECT, DESCRIPTION, LINK } = req.body;

    if (!SUBJECT) {
      res.status(400).json({ error: "SUBJECT is required" });
      return;
    }

    const connection = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      port: 3306,
      database: "quality",
    });

    connection.connect(function (err) {
      if (err) {
        console.error("Error connecting: " + err.stack);
        res.status(500).json({ error: "Database connection failed" });
        return;
      }

      const query = `UPDATE PPL_INPT_HELP SET DESCRIPTION = ?, LINK = ? WHERE SUBJECT = ?`;

      const values = [DESCRIPTION, LINK, SUBJECT];

      connection.query(query, values, (err, result) => {
        if (err) {
          console.log("Failed to update input help: " + err);
          connection.end();
          res.status(500).json({ error: "Failed to update input help" });
          return;
        }

        if (result.affectedRows === 0) {
          connection.end();
          res.status(404).json({ error: "Input help record not found" });
          return;
        }

        connection.end();
        res.json({
          success: true,
          message: "Input help record updated successfully",
        });
      });
    });
  } catch (err) {
    console.log("Error in PUT /inputhelp: ", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ==================================================
// Delete a help record
router.delete("/", (req, res) => {
  try {
    const { SUBJECT } = req.body;

    if (!SUBJECT) {
      res.status(400).json({ error: "SUBJECT is required" });
      return;
    }

    const connection = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      port: 3306,
      database: "quality",
    });

    connection.connect(function (err) {
      if (err) {
        console.error("Error connecting: " + err.stack);
        res.status(500).json({ error: "Database connection failed" });
        return;
      }

      const query = `DELETE FROM PPL_INPT_HELP WHERE SUBJECT = ?`;

      connection.query(query, [SUBJECT], (err, result) => {
        if (err) {
          console.log("Failed to delete input help: " + err);
          connection.end();
          res.status(500).json({ error: "Failed to delete input help" });
          return;
        }

        if (result.affectedRows === 0) {
          connection.end();
          res.status(404).json({ error: "Input help record not found" });
          return;
        }

        connection.end();
        res.json({
          success: true,
          message: "Input help record deleted successfully",
        });
      });
    });
  } catch (err) {
    console.log("Error in DELETE /inputhelp: ", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
