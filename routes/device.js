const express = require("express");
const router = express.Router();
const mysql = require("mysql2");
// update for updating


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

      const query = `UPDATE DEVICES SET NEXT_DATE = ? WHERE DEVICE_ID = ?`;

      const values = [
        req.body.NEXT_DATE,
        req.body.DEVICE_ID,
      ];

      connection.query(query, values, (err) => {
        if (err) {
          console.error("Failed to update device: " + err);
          res.sendStatus(500);
          return;
        }
        res.sendStatus(204);
      });

      connection.end();
    });
  } catch (err) {
    console.error("Error connecting to DB: ", err);
    res.sendStatus(500);
  }
});

// ==================================================
// Get all records
router.get("/", async (req, res) => {
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

      // const query = `SELECT * FROM DEVICES`;
      const query = `SELECT * FROM DEVICES WHERE STATUS != 'D' ORDER BY DEVICE_ID`;

      connection.query(query, (err, rows) => {
        if (err) {
          console.error("Failed to query for devices: " + err);
          res.sendStatus(500);
          return;
        }
        if (rows.length === 0) {
          res.json({ message: "No records found" });
        } else {
          res.json(rows);
        }
      });

      connection.end();
    });
  } catch (err) {
    console.error("Error connecting to DB: ", err);
    res.sendStatus(500);
  }
});

// ==================================================
// Get a single record by id
router.get("/:id", async (req, res) => {
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

      const query = `SELECT d.*, dn.DEVICE_NOTE FROM DEVICES d LEFT JOIN DEVICE_NOTES dn ON d.DEVICE_ID = dn.DEVICE_ID WHERE d.DEVICE_ID = ?`;

      connection.query(query, [req.params.id], (err, rows) => {
        if (err) {
          console.error("Failed to query for device: " + err);
          res.sendStatus(500);
          return;
        }
        if (rows.length === 0) {
          res.json({ message: "No records found" });
        } else {
          res.json(rows[0]);
        }
      });

      connection.end();
    });
  } catch (err) {
    console.error("Error connecting to DB: ", err);
    res.sendStatus(500);
  }
});

// ==================================================
// Create a new record
router.post("/create", async (req, res) => {
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

      const query = `INSERT INTO DEVICES (DEVICE_ID, NAME, STATUS, DEVICE_TYPE, MANUFACTURER_NAME, MODEL, SERIAL_NUMBER, MAJOR_LOCATION, MINOR_LOCATION, PURCHASE_DATE, NEXT_DATE, CREATE_BY, CREATE_DATE, PURCHASE_PRICE) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      const values = [
        req.body.DEVICE_ID,
        req.body.NAME,
        req.body.STATUS,
        req.body.DEVICE_TYPE,
        req.body.MANUFACTURER_NAME,
        req.body.MODEL,
        req.body.SERIAL_NUMBER,
        req.body.MAJOR_LOCATION,
        req.body.MINOR_LOCATION,
        req.body.PURCHASE_DATE,
        req.body.NEXT_DATE,
        req.body.CREATE_BY,
        req.body.CREATE_DATE,
        req.body.PURCHASE_PRICE,
      ];

      connection.query(query, values, (err) => {
        if (err) {
          console.error("Failed to insert device: " + err);
          res.sendStatus(500);
          return;
        }
        res.json({ message: "Record created successfully" });
      });

      connection.end();
    });
  } catch (err) {
    console.error("Error connecting to DB: ", err);
    res.sendStatus(500);
  }
});

// ==================================================
// Update a record by id
router.put("/editdevice", async (req, res) => {
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

      const query = `UPDATE DEVICES SET NAME = ?, DEVICE_TYPE = ?, MANUFACTURER_NAME = ?, MODEL = ?, SERIAL_NUMBER = ?, MAJOR_LOCATION = ?, MINOR_LOCATION = ?, PURCHASE_DATE = ?, PURCHASE_PRICE = ?, MODIFIED_BY = ?, MODIFIED_DATE = ? WHERE DEVICE_ID = ?`;

      const values = [
        req.body.NAME,
        req.body.DEVICE_TYPE,
        req.body.MANUFACTURER_NAME,
        req.body.MODEL,
        req.body.SERIAL_NUMBER,
        req.body.MAJOR_LOCATION,
        req.body.MINOR_LOCATION,
        req.body.PURCHASE_DATE,
        req.body.PURCHASE_PRICE,
        req.body.MODIFIED_BY,
        req.body.MODIFIED_DATE,
        req.body.DEVICE_ID,
      ];

      connection.query(query, values, (err) => {
        if (err) {
          console.error("Failed to update device: " + err);
          res.sendStatus(500);
          return;
        }
        res.json({ message: "Record updated successfully" });
      });

      connection.end();
    });
  } catch (err) {
    console.error("Error connecting to DB: ", err);
    res.sendStatus(500);
  }
});

// ==================================================
// Edit devcal record
router.put("/editdevcal", async (req, res) => {
  // console.log("Request body: ", req.body); // Log the request body for debugging
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

      // Build dynamic SET clause and values array based on req.body
      const allowedFields = [
        "ASSI_EMPLOYEE_ID",
        "DAYS_REMAINING",
        "STATUS",
        "NEXT_DATE",
        "SPECIAL_INTERVAL",
        "STANDARD_INTERVAL",
        "WARNING_INTERVAL",
        "MODIFIED_BY",
        "MODIFIED_DATE"
      ];

      const setClauses = [];
      const values = [];

      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          setClauses.push(`${field} = ?`);
          values.push(req.body[field]);
        }
      });

      // Always require DEVICE_ID for WHERE clause
      if (!req.body.DEVICE_ID) {
        res.status(400).json({ error: "DEVICE_ID is required" });
        connection.end();
        return;
      }

      // Ensure at least one field is being updated
      if (setClauses.length === 0) {
        res.status(400).json({ error: "No valid fields provided for update" });
        connection.end();
        return;
      }

      const query = `UPDATE DEVICES SET ${setClauses.join(", ")} WHERE DEVICE_ID = ?`;
      values.push(req.body.DEVICE_ID);

      connection.query(query, values, (err) => {
        if (err) {
          console.error("Failed to update device calibration: " + err);
          res.sendStatus(500);
          connection.end();
          return;
        }
        res.json({ message: "Record updated successfully" });
        connection.end();
      });
    });
  } catch (err) {
    console.error("Error connecting to DB: ", err);
    res.sendStatus(500);
  }
});

// ==================================================
// Delete a record by id
router.delete("/delete", async (req, res) => {
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

      const query = `DELETE FROM DEVICES WHERE DEVICE_ID = ?`;

      connection.query(query, [req.body.DEVICE_ID], (err) => {
        if (err) {
          console.error("Failed to delete device: " + err);
          res.sendStatus(500);
          return;
        }
        res.json({ message: "Record deleted successfully" });
      });

      connection.end();
    });
  } catch (err) {
    console.error("Error connecting to DB: ", err);
    res.sendStatus(500);
  }
});

router.put("/savenote", async (req, res) => {
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

      const { id, notes } = req.body;

      const upsertQuery = `
        INSERT INTO DEVICE_NOTES (DEVICE_ID, DEVICE_NOTE)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE DEVICE_NOTE = VALUES(DEVICE_NOTE)
      `;
      connection.query(upsertQuery, [id, notes], (err) => {
        if (err) {
          console.error("Failed to save device note: " + err);
          res.sendStatus(500);
          connection.end();
          return;
        }
        res.json({ message: "Note saved successfully" });
        connection.end();
      });
      return; 
      
    });
  } catch (err) {
    console.error("Error connecting to DB: ", err);
    res.sendStatus(500);
  }
});

module.exports = router;
