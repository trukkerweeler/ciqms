// ==================================================
// CUSTOMER ROUTER

require("dotenv").config();

const express = require("express");
const router = express.Router();
const mysql = require("mysql");

// ==================================================
// put response text
router.put("/response/:id", (req, res) => {
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
      // sql to insert on duplicate key update
      const query = `INSERT INTO DOCM_CHNG_RSPN (REQUEST_ID, RESPONSE_TEXT) VALUES (?, ?) ON DUPLICATE KEY UPDATE RESPONSE_TEXT = ?`;
      connection.query(query, [req.params.id, req.body.RESPONSE_TEXT, req.body.RESPONSE_TEXT], (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for doc change response text: " + err);
          res.sendStatus(500);
          return;
        }
        res.json(rows);
      });

      connection.end();
    });
  } catch (err) {
    console.log("Error connecting to Db 42");
    return;
  }
});

// ==================================================
// put customer
router.put("/:id", (req, res) => {
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
      // build the query from the request body
      let query = `UPDATE CUSTOMER SET `;
      for (let key in req.body) {
        query += `${key} = '${req.body[key]}', `;
      }
      // remove the last comma and space
      query = query.slice(0, -2);
      query += ` WHERE CUSTOMER_ID = '${req.params.id}'`;
      console.log(query);
      connection.query(query, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for customer update: " + err);
          res.sendStatus(500);
          return;
        }
        res.json(rows);
      });

      connection.end();
    });
  } catch (err) {
      console.log("Error connecting to Db 83");
      return;
    }
});

// ==================================================
// Get all records
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
        return;
      }
      // console.log('Connected to DB');

      const query =
        "select * from CUSTOMER";
      // const query = 'select * from DOCM_CHNG_RQST';
      connection.query(query, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for CUSTOMER: " + err);
          res.sendStatus(500);
          return;
        }
        res.json(rows);
      });

      connection.end();
    });
  } catch (err) {
    console.log("Error connecting to Db 114");
    return;
  }
});

// ==================================================
// Create a record
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
        return;
      }
      console.log("Connected to DB");

      const date_due = new Date(req.body.DUE_DATE);
      // convert ASSIGNED_TO to uppercase
      req.body.ASSIGNED_TO = req.body.ASSIGNED_TO.toUpperCase();
      // convert DOCUMENT_ID to uppercase
      req.body.DOCUMENT_ID = req.body.DOCUMENT_ID.toUpperCase();
      // convert to MySQL date format
      date_due.setDate(date_due.getDate() + 30);
      console.log(date_due.toLocaleDateString());
      date_due.toLocaleDateString();

      const query = `INSERT INTO DOCM_CHNG_RQST (
        REQUEST_ID,
        REQUEST_DATE,
        ASSIGNED_TO,
        DUE_DATE,
        DOCUMENT_ID,
        CHANGE_TYPE,
        CHANGE_REASON,
        PRIORITY,
        CREATE_BY,
        CREATE_DATE
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      const values = [
        req.body.REQUEST_ID,
        req.body.REQUEST_DATE,
        req.body.ASSIGNED_TO,
        req.body.DUE_DATE,
        req.body.DOCUMENT_ID,
        req.body.CHANGE_TYPE,
        req.body.CHANGE_REASON,
        req.body.PRIORITY,
        req.body.CREATE_BY,
        req.body.CREATE_DATE
      ];
      
      connection.query(query, values, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for doc change insert: " + err);
          res.sendStatus(500);
          return;
        }
        res.json(rows);
      });

      const updateQuery = `UPDATE SYSTEM_IDS SET CURRENT_ID = '${req.body.REQUEST_ID}' WHERE TABLE_NAME = 'DOCM_CHNG_RQST'`;
      connection.query(updateQuery, (err, rows, fields) => {
        if (err) {
          console.log(
            "Failed to query for doc change system id update: " + err
          );
          res.sendStatus(500);
          return;
        }
      });

      const updateQuery2 = `INSERT INTO DOC_CHG_REQ_TXT (REQUEST_ID, REQUEST_TEXT) VALUES (?, ?)`;
      connection.query(updateQuery2, [req.body.REQUEST_ID, req.body.REQUEST_TEXT], (err, rows, fields) => {
        if (err) {
          console.log("Failed to update for doc change text: " + err);
          res.sendStatus(500);
          return;
        }
      });

      connection.end();
    });
  } catch (err) {
    console.log("Error connecting to Db (changes 106)");
    return;
  }
});


// ==================================================
// Get a single record
router.get("/:id", (req, res) => {
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

      const query = `SELECT NAME, EMAIL_ADDRESS, PHONE, CITY, STATE, ZIP FROM CUSTOMER WHERE CUSTOMER_ID = ?`;

      connection.query(query, [req.params.id], (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for customer: " + err);
          res.sendStatus(500);
          return;
        }
        res.json(rows);
      });

      connection.end();
    });
  } catch (err) {
    console.log("Error connecting to Db 192");
    return;
  }
});


module.exports = router;
