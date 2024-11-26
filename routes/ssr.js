require("dotenv").config();
const express = require("express");
const router = express.Router();
const mysql = require("mysql");

router.post("/:iid", (req, res) => {
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

      let key = Object.keys(req.body)[0];
      // console.log('key: ' + key['SUPPLIER_ID']);
      let sid = req.body[key].SUPPLIER_ID.toUpperCase();
      let unit = req.body[key].UNIT.toUpperCase();

      let query = `INSERT INTO EIGHTYFOURELEVEN (
        VENDPERF_ID, INPUT_ID, SUPPLIER_ID, UNIT, VALUE, SAMPLE_DATE, PEOPLE_ID
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`;
      let values = [
        req.body[key].VENDPERF_ID,
        req.params.iid,
        sid,
        unit,
        req.body[key].VALUE,
        req.body[key].SAMPLE_DATE,
        req.body[key].PEOPLE_ID,
      ];

      // console.log(query);

      connection.query(query, values, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for EIGHTYFOURELEVEN: " + err);
          res.sendStatus(500);
          return;
        }
        res.json(rows);
      });

      const updateQuery = `UPDATE SYSTEM_IDS SET CURRENT_ID = '${req.body[key].VENDPERF_ID}' WHERE TABLE_NAME = 'EIGHTYFOURELEVEN'`;
      connection.query(updateQuery, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for system id update: " + err);
          res.sendStatus(500);
          return;
        }
      });

      connection.end();
    });
  } catch (err) {
    console.log("Error connecting to Db (changes 68)");
    return;
  }
});

// Get the next ID for a new record
router.get("/nextSSRId", (req, res) => {
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

      const query =
        'SELECT CURRENT_ID FROM SYSTEM_IDS where TABLE_NAME = "EIGHTYFOURELEVEN"';
      connection.query(query, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for SYSTEM_IDS EIGHTYFOURELEVEN: " + err);
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
    console.log("Error connecting to Db 107 ssr.js");
    return;
  }
});

module.exports = router;
