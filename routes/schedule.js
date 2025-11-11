// import { getUserValue } from './utils.mjs';
require("dotenv").config();
// sequelize...

const express = require("express");
const router = express.Router();
const mysql = require("mysql2");

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

      const query = `SELECT * FROM AUDIT_MANAGER WHERE YEAR(SCHEDULED_DATE) = YEAR(CURDATE()) ORDER BY AUDIT_MANAGER_ID DESC`;

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

    // res.send('Hello Corrective!');
  } catch (err) {
    console.log("Error connecting to Db");
    return;
  }
});

// Get the next AuditId for a new record
router.get("/nextAuditId", (req, res) => {
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
        'SELECT CURRENT_ID FROM SYSTEM_IDS where TABLE_NAME = "AUDIT"';
      connection.query(query, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for current id: " + err);
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
    console.log("Error connecting to Db 94");
    return;
  }
});

// Get the next ManagerID for a new record
router.get("/nextManagerId", (req, res) => {
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
        'SELECT CURRENT_ID FROM SYSTEM_IDS where TABLE_NAME = "AUDIT_MANAGER"';
      connection.query(query, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for current id: " + err);
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
    console.log("Error connecting to Db 94");
    return;
  }
});

// ==================================================
// Create a record
router.post("/", (req, res) => {
  // console.log('102');
  // console.log(req.body);
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

      const query = `insert into AUDIT_MANAGER (AUDIT_MANAGER_ID
            , AUDIT_ID
            , STANDARD
            , SUBJECT
            , SCHEDULED_DATE
            , LEAD_AUDITOR
            , AUDITEE1
            , CREATE_BY
            , CREATE_DATE
            ) values (
                '${req.body.AUDIT_MANAGER_ID}'
                , '${req.body.AUDIT_ID}'
                , '${req.body.STANDARD}'
                , '${req.body.SUBJECT}'
                , '${req.body.SCHEDULED_DATE}'
                , '${req.body.LEAD_AUDITOR}'
                , '${req.body.AUDITEE1}'
                , '${req.body.CREATE_BY}'
                , '${req.body.CREATE_DATE}'
            )`;

      // console.log(query);

      connection.query(query, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for AUDIT_MANAGER insert: " + err);
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

      const updateQuery = `UPDATE SYSTEM_IDS SET CURRENT_ID = '${req.body.AUDIT_MANAGER_ID}' WHERE TABLE_NAME = 'AUDIT_MANAGER'`;
      connection.query(updateQuery, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for system id update: " + err);
          res.sendStatus(500);
          return;
        }
      });

      const auditIdQuery = `UPDATE SYSTEM_IDS SET CURRENT_ID = '${req.body.AUDIT_ID}' WHERE TABLE_NAME = 'AUDIT'`;
      connection.query(auditIdQuery, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for audit id update: " + err);
          res.sendStatus(500);
          return;
        }
      });

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

// CLOSE THE INPUT<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
router.put("/close/:id", (req, res) => {
  // console.log("Params: " + req.params.id);
  // console.log(req.body);
  let mytable = "";
  let appended = "";
  const myfield = Object.keys(req.body)[1];

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
      const query = `UPDATE PEOPLE_INPUT SET CLOSED = 'Y', CLOSED_DATE = '${req.body.CLOSED_DATE}' WHERE INPUT_ID = '${req.params.id}'`;
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
    console.log("Error connecting to Db 345");
    return;
  }
});

module.exports = router;
