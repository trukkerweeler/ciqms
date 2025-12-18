// import { getUserValue } from './utils.mjs';
// require("dotenv").config();
// sequelize...

const express = require("express");
const router = express.Router();
const mysql = require("mysql2");
const systable = "PROCESS_MODEL";

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

      const query = `select * from PROCESS_MODEL order by PROCESS_ID, AREA_NUMBER, ACTIVITY_NO, ELEMENT_NO`;

      connection.query(query, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for PROCESS_MODEL: " + err);
          res.sendStatus(500);
          return;
        }
        res.json(rows);
      });

      connection.end();
    });
  } catch (err) {
    console.log("Error connecting to Db");
    return;
  }
});

// Get the next ID for a new record
router.get("/nextId", (req, res) => {
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

      // const query = 'SELECT CURRENT_ID FROM SYSTEM_IDS where TABLE_NAME = "PROCESS_AUDIT"';
      // connection.query(query, (err, rows, fields) => {
      //     if (err) {
      //         console.log('Failed to query for current id: ' + err);
      //         res.sendStatus(500);
      //         return;
      //     }
      //     const nextId = parseInt(rows[0].CURRENT_ID) + 1;
      //     let dbNextId = nextId.toString().padStart(7, '0');

      //     res.json(dbNextId);
      // });

      connection.end();
    });
  } catch (err) {
    console.log("Error connecting to Db 94");
    return;
  }
});

// ==================================================
// Create a record
router.post("/add", (req, res) => {
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

      const query = `insert into PROCESS_MODEL (PROCESS_ID
            , AREA_NUMBER
            , ACTIVITY_NO
            , ELEMENT_NO
            , NAME
            , EMPLOYEE_ID
            , JOB_CODE
            , FUNCTION_CODE
            , CREATE_BY
            , CREATE_DATE
            ) values (
                '${req.body.PROCESS_ID}'
                , '${req.body.AREA_NUMBER}'
                , '${req.body.ACTIVITY_NO}'
                , '${req.body.ELEMENT_NO}'
                , '${req.body.NAME}'
                , '${req.body.EMPLOYEE_ID}'
                , '${req.body.JOB_CODE}'
                , '${req.body.FUNCTION_CODE}'
                , '${req.body.CREATE_BY}'
                , '${req.body.CREATE_DATE}'                
            )`;

      // console.log(query);

      connection.query(query, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for PROCESS_MODEL insert: " + err);
          res.sendStatus(500);
          return;
        }
        res.json(rows);
      });

      // // escape the apostrophe
      // let inputText = req.body.INPUT_TEXT.replace(/'/g, "\\'");
      // // escape the backslash
      // inputText = req.body.INPUT_TEXT.replace(/\\/g, "\\\\");
      // const insertQuery = `insert into PPL_INPT_TEXT values ('${req.body.INPUT_ID}', '${inputText}')`;
      // connection.query(insertQuery, (err, rows, fields) => {
      //     if (err) {
      //         console.log('Failed to query for PPL_INPT_TEXT insert: ' + err);
      //         res.sendStatus(500);
      //         return;
      //     }
      // });

      connection.end();
    });
  } catch (err) {
    console.log("Error connecting to Db (changes 170)");
    return;
  }
});

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

      const query = `SELECT 
        pi.INPUT_ID
        , pi.PEOPLE_ID
        , pi.PROJECT_ID
        , INPUT_DATE
        , pi.DUE_DATE
        , pi.ASSIGNED_TO
        , INPUT_TYPE
        , pi.SUBJECT
        , pi.CLOSED
        , pi.CLOSED_DATE
        , pit.INPUT_TEXT
        , pir.RESPONSE_TEXT
        , pif.FOLLOWUP_TEXT 
        , p.NAME
        , pirc.RECUR_ID
        FROM quality.PEOPLE_INPUT pi left join PPL_INPT_TEXT pit on pi.INPUT_ID = pit.INPUT_ID
        left join PPL_INPT_FLUP pif on pi.INPUT_ID = pif.INPUT_ID
        left join PPL_INPT_RSPN pir on pi.INPUT_ID = pir.INPUT_ID 
        left join PROJECT p on pi.PROJECT_ID = p.PROJECT_ID
        left join PPL_INPT_RCUR pirc on pi.USER_DEFINED_2 = pirc.RECUR_ID
        where pi.INPUT_ID = '${req.params.id}'`;

      // console.log(query);

      connection.query(query, (err, rows, fields) => {
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

router.put("/:id", (req, res) => {
  // console.log("Params: " + req.params.id);
  // console.log(req.body);
  let mytable = "";
  let appended = "";
  const myfield = Object.keys(req.body)[2];
  // console.log(myfield);
  switch (myfield) {
    case "RESPONSE_TEXT":
      // console.log('Response');
      mytable = "PPL_INPT_RSPN";
      // appended = req.body.RESPONSE_TEXT.replace(/'/g, "\\'");
      appended = req.body.RESPONSE_TEXT;
      break;
    case "FOLLOWUP_TEXT":
      // console.log('Followup');
      mytable = "PPL_INPT_FLUP";
      appended = req.body.FOLLOWUP_TEXT;
      break;
    case "INPUT_TEXT":
      // console.log('Input');
      mytable = "PPL_INPT_TEXT";
      appended = req.body.INPUT_TEXT;
      break;
    default:
      console.log("No match");
  }
  // Replace the br with a newline
  appended = appended.replace(/<br>/g, "\n");
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
      // console.log(req.body);
      const query = `REPLACE INTO ${mytable} SET 
        INPUT_ID = '${req.params.id}',
        ${myfield} = '${appended}'`;
      // console.log(query);
      connection.query(query, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for input : " + err);
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

module.exports = router;
