const express = require("express");
const router = express.Router();
const mysql = require("mysql2");

router.post("/", async (req, res) => {
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

      // First get the next ID
      const idQuery =
        'SELECT CURRENT_ID FROM SYSTEM_IDS WHERE TABLE_NAME = "PPL_INPT_RCUR"';
      connection.query(idQuery, (err, idRows) => {
        if (err) {
          console.log("Failed to get next ID: " + err);
          connection.end();
          res.status(500).json({ error: "Failed to get next ID" });
          return;
        }

        const nextId = parseInt(idRows[0].CURRENT_ID) + 1;
        const recurId = nextId.toString().padStart(7, "0");
        const inputId = req.body.INPUT_ID.toString().padStart(7, "0");

        // Insert the new record
        const sql = `INSERT INTO PPL_INPT_RCUR (RECUR_ID, INPUT_ID, ASSIGNED_TO, FREQUENCY, SUBJECT, STATUS) VALUES (?, ?, ?, ?, ?, 'A')`;
        const inserts = [
          recurId,
          inputId,
          req.body.ASSIGNED_TO,
          req.body.FREQUENCY,
          req.body.SUBJECT,
        ];

        connection.query(sql, inserts, (err, insertResult) => {
          if (err) {
            console.log("Failed to insert recurrence: " + err);
            connection.end();
            res.status(500).json({ error: "Failed to insert recurrence" });
            return;
          }

          // Update the system ID
          const updateQuery = `UPDATE SYSTEM_IDS SET CURRENT_ID = ? WHERE TABLE_NAME = 'PPL_INPT_RCUR'`;
          connection.query(updateQuery, [recurId], (err, updateResult) => {
            if (err) {
              console.log("Failed to update system ID: " + err);
              connection.end();
              res.status(500).json({ error: "Failed to update system ID" });
              return;
            }

            connection.end();
            res.json({ success: true, recurId: recurId });
          });
        });
      });
    });
  } catch (err) {
    console.log("Error in POST /recur: ", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get the next ID for a new recurrence
router.get("/nextId", (req, res) => {
  // res.json('0000005');
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
        return;
      }
      // console.log('Connected to DB');

      const query =
        'SELECT CURRENT_ID FROM SYSTEM_IDS where TABLE_NAME = "PPL_INPT_RCUR"';
      connection.query(query, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for attendance: " + err);
          res.sendStatus(500);
          return;
        }
        const nextId = parseInt(rows[0].CURRENT_ID) + 1;
        let dbNextId = nextId.toString().padStart(7, "0");

        res.json(dbNextId);
      });

      connection.end();
    });
  } catch (err) {
    console.log("Error connecting to Db 58");
    return;
  }
});

// Get the records for the recurrence table
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

      const query =
        'SELECT RECUR_ID, INPUT_ID, ASSIGNED_TO, FREQUENCY, SUBJECT, STATUS FROM PPL_INPT_RCUR WHERE STATUS = "A" ORDER BY SUBJECT ASC';
      connection.query(query, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for recurrence: " + err);
          connection.end();
          res.status(500).json({ error: "Failed to query recurrence data" });
          return;
        }
        connection.end();
        res.json(rows);
      });
    });
  } catch (err) {
    console.log("Error connecting to Db 128");
    res.status(500).json({ error: "Server error" });
  }
});

// Inactivate a recurring input
router.put("/inactivate", (req, res) => {
  try {
    const { INPUT_ID, ASSIGNED_TO } = req.body;

    if (!INPUT_ID || !ASSIGNED_TO) {
      res.status(400).json({ error: "INPUT_ID and ASSIGNED_TO are required" });
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

      // Inactivate by setting STATUS to 'I'
      const inputIdPadded = INPUT_ID.toString().padStart(7, "0");
      const query =
        'UPDATE PPL_INPT_RCUR SET STATUS = "I" WHERE INPUT_ID = ? AND ASSIGNED_TO = ? AND STATUS = "A"';

      connection.query(query, [inputIdPadded, ASSIGNED_TO], (err, result) => {
        if (err) {
          console.log("Failed to inactivate recurrence: " + err);
          connection.end();
          res.status(500).json({ error: "Failed to inactivate recurrence" });
          return;
        }

        if (result.affectedRows === 0) {
          connection.end();
          res.status(404).json({ error: "Recurring input not found" });
          return;
        }

        connection.end();
        res.json({
          success: true,
          message: "Recurring input inactivated successfully",
        });
      });
    });
  } catch (err) {
    console.log("Error in PUT /recur: ", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
