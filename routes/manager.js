// import { getUserValue } from './utils.mjs';
// require("dotenv").config();
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

      const query = `select * from PROCESS_AUDIT order by AUDIT_ID desc`;

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

      const query =
        'SELECT CURRENT_ID FROM SYSTEM_IDS where TABLE_NAME = "PROCESS_AUDIT"';
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

      const query = `insert into PROCESS_AUDIT (AUDIT_MANAGER_ID
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
          console.log("Failed to query for PROCESS AUDIT insert: " + err);
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

      const updateQuery = `UPDATE SYSTEM_IDS SET CURRENT_ID = '${req.body.AUDIT_ID}' WHERE TABLE_NAME = 'PROCESS_AUDIT'`;
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

      const query = `SELECT am.*, ac.CHECKLIST_ID, acq.QUESTION, aco.OBSERVATION, acr.REFERENCE from AUDIT_MANAGER am 
        left join AUDIT_CHECKLIST ac on am.AUDIT_MANAGER_ID = ac.AUDIT_MANAGER_ID 
        left join AUDT_CHKL_QUST acq on ac.AUDIT_MANAGER_ID = acq.AUDIT_MANAGER_ID and ac.CHECKLIST_ID = acq.CHECKLIST_ID
        left join AUDT_CHKL_OBSN aco on ac.AUDIT_MANAGER_ID = aco.AUDIT_MANAGER_ID and ac.CHECKLIST_ID = aco.CHECKLIST_ID
        left join AUDT_CHKL_RFNC acr on ac.AUDIT_MANAGER_ID = acr.AUDIT_MANAGER_ID and ac.CHECKLIST_ID = acr.CHECKLIST_ID
        where am.AUDIT_MANAGER_ID = '${req.params.id}'`;

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
    console.log("Error connecting to Db 229");
    return;
  }
});

// CLOSE THE AUDIT<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
router.put("/completed", (req, res) => {
  // console.log("Params: " + req.params.id);
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
      const query = `UPDATE AUDIT_MANAGER SET COMPLETION_DATE = '${req.body.COMPLETION_DATE}' WHERE AUDIT_MANAGER_ID = '${req.body.AUDIT_MANAGER_ID}'`;
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

// ==================================================
//  PUT audit manager record
router.put("/:id", (req, res) => {
  // console.log(req.body);
  // console.log(req.params.id);
  let mytable = "";
  let appended = "";
  const myfield = Object.keys(req.body)[1];
  // let amid = req.params.id;

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
      const query = `UPDATE AUDIT_MANAGER SET STANDARD = '${req.body.STANDARD}', SUBJECT = '${req.body.SUBJECT}', SCHEDULED_DATE = '${req.body.SCHEDULED_DATE}', LEAD_AUDITOR = '${req.body.LEAD_AUDITOR}', AUDITEE1 = '${req.body.AUDITEE1}' WHERE AUDIT_MANAGER_ID = '${req.params.id}'`;
      // console.log(query);

      connection.query(query, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for corrective actions : " + err);
          res.sendStatus(500);
          return;
        }
        res.json(rows);
      });

      connection.end();
    });
  } catch (err) {
    console.log("Error connecting to Db 253");
    return;
  }
});

module.exports = router;
