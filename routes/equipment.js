const express = require("express");
const router = express.Router();
const mysql = require("mysql2");
const fs = require("fs");
const path = require("path");

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

      const query = `SELECT * FROM EQUIPMENT WHERE STATUS != 'D' ORDER BY EQUIPMENT_ID`;

      connection.query(query, (err, rows) => {
        if (err) {
          console.error("Failed to query for equipment: " + err);
          res.sendStatus(500);
          return;
        }
        if (rows.length === 0) {
          res.json([]);
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

      const query = `SELECT * FROM EQUIPMENT WHERE EQUIPMENT_ID = ?`;

      connection.query(query, [req.params.id], (err, rows) => {
        if (err) {
          console.error("Failed to query for equipment: " + err);
          res.sendStatus(500);
          return;
        }
        if (rows.length === 0) {
          res.json([]);
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

      const query = `INSERT INTO EQUIPMENT (EQUIPMENT_ID, NAME, EQUIPMENT_TYPE, STATUS, ASSIGNED_TO, MINOR_LOCATION, MAJOR_LOCATION, PM_UD1, CUSTOMER_ID, PRODUCT_ID, SUPPLIER_ID, SUPP_EQUIP_ID, SUPP_EQUIP_NAME, MANUFACTURER_NAME, MODEL_NUMBER, SERIAL_NUMBER, PURCHASE_DATE, PURCHASE_PRICE, IN_USE, WARRANTY_DATE, EXTN_WARRAN_DATE, CREATE_BY, CREATE_DATE, CAL_DEVICE_ID, ENTITY_ID) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      const values = [
        req.body.EQUIPMENT_ID,
        req.body.NAME,
        req.body.EQUIPMENT_TYPE,
        req.body.STATUS,
        req.body.ASSIGNED_TO
          ? req.body.ASSIGNED_TO.toUpperCase()
          : req.body.ASSIGNED_TO,
        req.body.MINOR_LOCATION,
        req.body.MAJOR_LOCATION,
        req.body.PM_UD1,
        req.body.CUSTOMER_ID
          ? req.body.CUSTOMER_ID.toUpperCase()
          : req.body.CUSTOMER_ID,
        req.body.PRODUCT_ID,
        req.body.SUPPLIER_ID,
        req.body.SUPP_EQUIP_ID,
        req.body.SUPP_EQUIP_NAME,
        req.body.MANUFACTURER_NAME,
        req.body.MODEL_NUMBER,
        req.body.SERIAL_NUMBER,
        req.body.PURCHASE_DATE,
        req.body.PURCHASE_PRICE,
        req.body.IN_USE,
        req.body.WARRANTY_DATE,
        req.body.EXTN_WARRAN_DATE,
        req.body.CREATE_BY,
        req.body.CREATE_DATE,
        req.body.CAL_DEVICE_ID,
        req.body.ENTITY_ID,
      ];

      connection.query(query, values, (err) => {
        if (err) {
          console.error("Failed to insert equipment: " + err);
          res.sendStatus(500);
          connection.end();
          return;
        }

        res.json({ message: "Record created successfully" });
        connection.end();
      });
    });
  } catch (err) {
    console.error("Error connecting to DB: ", err);
    res.sendStatus(500);
  }
});

// ==================================================
// Update a record by id
router.put("/edit", async (req, res) => {
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

      const query = `UPDATE EQUIPMENT SET NAME = ?, EQUIPMENT_TYPE = ?, STATUS = ?, ASSIGNED_TO = ?, MINOR_LOCATION = ?, MAJOR_LOCATION = ?, PM_UD1 = ?, CUSTOMER_ID = ?, PRODUCT_ID = ?, SUPPLIER_ID = ?, SUPP_EQUIP_ID = ?, SUPP_EQUIP_NAME = ?, MANUFACTURER_NAME = ?, MODEL_NUMBER = ?, SERIAL_NUMBER = ?, PURCHASE_DATE = ?, PURCHASE_PRICE = ?, IN_USE = ?, WARRANTY_DATE = ?, EXTN_WARRAN_DATE = ?, MODIFIED_BY = ?, MODIFIED_DATE = ?, CAL_DEVICE_ID = ?, ENTITY_ID = ? WHERE EQUIPMENT_ID = ?`;

      const values = [
        req.body.NAME,
        req.body.EQUIPMENT_TYPE,
        req.body.STATUS,
        req.body.ASSIGNED_TO
          ? req.body.ASSIGNED_TO.toUpperCase()
          : req.body.ASSIGNED_TO,
        req.body.MINOR_LOCATION,
        req.body.MAJOR_LOCATION,
        req.body.PM_UD1,
        req.body.CUSTOMER_ID
          ? req.body.CUSTOMER_ID.toUpperCase()
          : req.body.CUSTOMER_ID,
        req.body.PRODUCT_ID,
        req.body.SUPPLIER_ID,
        req.body.SUPP_EQUIP_ID,
        req.body.SUPP_EQUIP_NAME,
        req.body.MANUFACTURER_NAME,
        req.body.MODEL_NUMBER,
        req.body.SERIAL_NUMBER,
        req.body.PURCHASE_DATE,
        req.body.PURCHASE_PRICE,
        req.body.IN_USE,
        req.body.WARRANTY_DATE,
        req.body.EXTN_WARRAN_DATE,
        req.body.MODIFIED_BY,
        req.body.MODIFIED_DATE,
        req.body.CAL_DEVICE_ID,
        req.body.ENTITY_ID,
        req.body.EQUIPMENT_ID,
      ];

      connection.query(query, values, (err) => {
        if (err) {
          console.error("Failed to update equipment: " + err);
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

      const query = `DELETE FROM EQUIPMENT WHERE EQUIPMENT_ID = ?`;

      connection.query(query, [req.body.EQUIPMENT_ID], (err) => {
        if (err) {
          console.error("Failed to delete equipment: " + err);
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

module.exports = router;
