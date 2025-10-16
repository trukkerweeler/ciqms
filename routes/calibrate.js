const express = require("express");
const mysql = require("mysql2");
const router = express.Router();

// ==================================================
// Set next due for device
router.post("/nextdue", async (req, res) => {
  try {
    const connection = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      port: 3306,
      database: "quality",
    });

    connection.connect((err) => {
      if (err) {
        console.error("Error connecting: " + err.stack);
        res.sendStatus(500);
        return;
      }

      // First, get the current NEXT_DATE for the device
      const selectQuery = `SELECT NEXT_DATE FROM DEVICES WHERE DEVICE_ID = ?`;

      connection.query(selectQuery, [req.body.DEVICE_ID], (err, rows) => {
        if (err) {
          console.error("Failed to query current device date: " + err);
          res.sendStatus(500);
          connection.end();
          return;
        }

        const newDate = new Date(req.body.NEXT_DATE);
        let shouldUpdate = true;

        // If device exists and has a current NEXT_DATE, compare dates
        if (rows.length > 0 && rows[0].NEXT_DATE) {
          const currentDate = new Date(rows[0].NEXT_DATE);
          // Only update if the new date is later than the current date
          shouldUpdate = newDate > currentDate;
        }

        if (shouldUpdate) {
          // Update the device with the new date
          const updateQuery = `UPDATE DEVICES SET NEXT_DATE = ? WHERE DEVICE_ID = ?`;
          const values = [req.body.NEXT_DATE, req.body.DEVICE_ID];

          connection.query(updateQuery, values, (err) => {
            if (err) {
              console.error("Failed to update device: " + err);
              res.sendStatus(500);
            } else {
              res.sendStatus(204);
            }
            connection.end();
          });
        } else {
          // Don't update, but return success since the calibration was still recorded
          console.log(
            `Skipped updating device ${req.body.DEVICE_ID} - new date ${req.body.NEXT_DATE} is not later than current date ${rows[0].NEXT_DATE}`
          );
          res.sendStatus(204);
          connection.end();
        }
      });
    });
  } catch (err) {
    console.error("Error connecting to DB: ", err);
    res.sendStatus(500);
  }
});

// ==================================================
// Get all records
router.get("/", async (_, res) => {
  try {
    const connection = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      port: 3306,
      database: "quality",
    });

    const query = `SELECT * FROM CALIBRATIONS`;

    connection.query(query, (err, rows) => {
      if (err) {
        console.error("Failed to query for getallcalibrations: " + err);
        res.sendStatus(500);
        return;
      }
      res.json(rows);
    });

    connection.end();
  } catch (err) {
    console.error("Error connecting to DB:", err);
    res.sendStatus(500);
  }
});

// ==================================================
// Get records by ID
router.get("/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const connection = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      port: 3306,
      database: "quality",
    });

    const query = `SELECT * FROM CALIBRATIONS c WHERE c.DEVICE_ID = ? ORDER BY c.CALIBRATION_ID DESC`;

    connection.query(query, [id], (err, rows) => {
      if (err) {
        console.error("Failed to query for calibrations by device ID: " + err);
        res.sendStatus(500);
        return;
      }
      res.json(rows);
    });

    connection.end();
  } catch (err) {
    console.error("Error connecting to DB:", err);
    res.sendStatus(500);
  }
});

// ==================================================
// Create a new record
router.post("/", async (req, res) => {
  try {
    const connection = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      port: 3306,
      database: "quality",
    });
    // console.log('Creating new calibration record:', req.body);

    const query = `INSERT INTO CALIBRATIONS (CALIBRATION_ID, DEVICE_ID, CALIBRATE_DATE, CALIBRATED_BY, SUPPLIER_ID, EMPLOYEE_ID, RESULT, CREATE_DATE, CREATE_BY) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const queryParams = [
      req.body.CALIBRATION_ID || null,
      req.body.DEVICE_ID,
      req.body.CALIBRATE_DATE,
      req.body.CALIBRATED_BY,
      req.body.SUPPLIER_ID || null,
      req.body.EMPLOYEE_ID || null,
      req.body.RESULT,
      req.body.CREATE_DATE,
      req.body.CREATE_BY,
    ];

    connection.query(query, queryParams, (err, result) => {
      if (err) {
        console.error("Failed to insert new calibration record: " + err);
        res.sendStatus(500);
        return;
      }
      res
        .status(201)
        .json({ message: "Record created successfully", id: result.insertId });
    });

    connection.end();
  } catch (err) {
    console.error("Error connecting to DB:", err);
    res.sendStatus(500);
  }
});

module.exports = router;
