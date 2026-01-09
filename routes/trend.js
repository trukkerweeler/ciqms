// import { getUserValue } from './utils.mjs';

const express = require("express");
const router = express.Router();
const mysql = require("mysql2");
let test = true;

// ==================================================
// Get a single record
router.get("/:id", (req, res) => {
  // console.log(req.params.id);
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

      const query = `SELECT n.NCM_ID
        , CUSTOMER_ID
        , SUPPLIER_ID
        , PROCESS_ID
        , AREA_NUMBER
        , ACTIVITY_NO
        , ELEMENT_NO
        , DISPOSITION_TYPE
        , TOOL_ID
        , ncl.CORRECTIVE_ID
        FROM quality.NONCONFORMANCE n 
        LEFT JOIN NCM_CORRECT_LINK ncl ON n.NCM_ID = ncl.NCM_ID
        WHERE n.NCM_ID = ?`;

      // console.log(query);

      connection.query(query, [req.params.id], (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for corrective actions: " + err);
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
// put the corrective action link
router.put("/:id/ncl", (req, res) => {
  const id = req.params.id;
  const data2 = req.body;
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
    let columns = Object.keys(data2);
    let placeholders = columns.map(() => "?").join(", ");
    let updateClause = columns
      .map((key) => `${key} = VALUES(${key})`)
      .join(", ");

    let query = `INSERT INTO quality.NCM_CORRECT_LINK (NCM_ID, ${columns.join(
      ", "
    )})
    VALUES (?, ${placeholders})
    ON DUPLICATE KEY UPDATE ${updateClause}`;
    let queryParams = [id, ...Object.values(data2)];

    connection.query(query, queryParams, (err, rows, fields) => {
      if (err) {
        console.log("Failed to query for corrective action link: " + err);
        res.sendStatus(500);
        return;
      }
      res.json(rows);
    });
    connection.end();
  });
});

// ==================================================
// put the trend data
router.put("/:id", (req, res) => {
  const id = req.params.id;
  const data = req.body;
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
    let queryUpdates = [];
    let queryParams = [];

    for (let key in data) {
      const value = data[key];

      // Skip NCM_ID (it's the WHERE clause identifier)
      if (key === "NCM_ID") continue;

      // Skip undefined, null, empty strings
      if (value === undefined || value === null || value === "") continue;

      // Skip objects and arrays (not valid column values)
      if (typeof value === "object") continue;

      // Add valid field
      queryUpdates.push(`${key} = ?`);
      queryParams.push(value);
    }

    // If no fields to update, return error
    if (queryUpdates.length === 0) {
      console.log("No fields to update");
      res.status(400).json({ error: "No fields to update" });
      connection.end();
      return;
    }

    let query = `UPDATE quality.NONCONFORMANCE SET ${queryUpdates.join(
      ", "
    )} WHERE NCM_ID = ?`;
    queryParams.push(id);

    // console.log("Trend UPDATE query:", query);
    // console.log("Trend UPDATE params:", queryParams);

    connection.query(query, queryParams, (err, rows, fields) => {
      if (err) {
        console.log("Failed to query for trend data: " + err);
        res.sendStatus(500);
        return;
      }
      res.json(rows);
    });
    connection.end();
  });
});

module.exports = router;
