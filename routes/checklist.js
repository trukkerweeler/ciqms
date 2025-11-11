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

      const query = `select * from PROCESS_AUDIT order by AUDIT_ID desc`;
      console.log(query);
      connection.query(query, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for process audit: " + err);
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

// Get the next Audit Manager ID for a new record
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
        'SELECT AUDIT_MANAGER_ID FROM SYSTEM_IDS where TABLE_NAME = "AUDIT_MANAGER"';
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
    console.log("Error connecting to Db 84");
    return;
  }
});

// Get the next Audit for a new record
router.get("/nextChecklist/:id", (req, res) => {
  amparams = req.params.id;
  console.log(amparams);
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
      console.log("Connected to DB104");

      const query = `select CHECKLIST_ID from AUDT_CHKL_QUST where AUDIT_MANAGER_ID = '${amparams}' order by CHECKLIST_ID desc limit 1`;
      // console.log(query);
      connection.query(query, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for current id: " + err);
          res.sendStatus(500);
          return;
        }
        if (rows.length === 0) {
          console.log("No rows returned");
          res.json("0000001");
          return;
        }
        const nextId = parseInt(rows[0].CHECKLIST_ID) + 1;
        let nextChecklistId = nextId.toString().padStart(7, "0");

        res.json(nextChecklistId);
      });

      connection.end();
    });
  } catch (err) {
    console.log("Error connecting to Db 122");
    return;
  }
});

// ==================================================
// Create a record
router.post("/", (req, res) => {
  // console.log('102');
  console.log(req.body);
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

      const query = `insert into AUDT_CHKL_QUST (AUDIT_MANAGER_ID, CHECKLIST_ID, QUESTION) values (?, ?, ?)`;
      const values = [
        req.body.AUDIT_MANAGER_ID,
        req.body.CHECKLIST_ID,
        req.body.QUESTION,
      ];

      connection.query(query, values, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for CHECKLIST insert: " + err);
          res.sendStatus(500);
          return;
        }
        res.json(rows);
      });

      const updateQuery = `UPDATE SYSTEM_IDS SET CURRENT_ID = '${req.body.AUDIT_MANAGER_ID}' WHERE TABLE_NAME = 'AUDIT_MANAGER'`;
      connection.query(updateQuery, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for system id update: " + err);
          res.sendStatus(500);
          return;
        }
      });

      // update the REFERENCE table
      const queryRef = `insert into AUDT_CHKL_RFNC (AUDIT_MANAGER_ID
            , CHECKLIST_ID
            , REFERENCE
            ) values (
                '${req.body.AUDIT_MANAGER_ID}'
                , '${req.body.CHECKLIST_ID}'                                                                                                                                                                                                    
                , '${req.body.REFERENCE}'
            )`;
      connection.query(queryRef, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for REFERENCE insert: " + err);
          res.sendStatus(500);
          return;
        }
        // res.sendStatus(200);
      });

      connection.end();
    });
  } catch (err) {
    console.log("Error connecting to Db (changes 170)");
    return;
  }
});

// create observation record
router.post("/obsn", (req, res) => {
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

      const query = `insert into AUDT_CHKL_OBSN (AUDIT_MANAGER_ID, CHECKLIST_ID, OBSERVATION) values (?, ?, ?)`;
      const values = [
        req.body.AUDIT_MANAGER_ID,
        req.body.CHECKLIST_ID,
        req.body.OBSERVATION,
      ];

      connection.query(query, values, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for OBSERVATION insert: " + err);
          res.sendStatus(500);
          return;
        }
        res.json(rows);
      });

      connection.end();
    });
  } catch (err) {
    console.log("Error connecting to Db 170");
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

      // const query = `SELECT am.*, acq.QUESTION, aco.OBSERVATION, acr.REFERENCE from AUDIT_MANAGER am
      // left join AUDT_CHKL_QUST acq on am.AUDIT_MANAGER_ID = acq.AUDIT_MANAGER_ID
      // left join AUDT_CHKL_OBSN aco on am.AUDIT_MANAGER_ID = aco.AUDIT_MANAGER_ID
      // left join AUDT_CHKL_RFNC acr on am.AUDIT_MANAGER_ID = acr.AUDIT_MANAGER_ID
      // where am.AUDIT_MANAGER_ID = '${req.params.id}'`;

      const query = `SELECT am.*, acq.QUESTION, aco.OBSERVATION, acr.REFERENCE, acq.CHECKLIST_ID from AUDT_CHKL_QUST acq 
        left join AUDT_CHKL_OBSN aco on acq.CHECKLIST_ID = aco.CHECKLIST_ID and aco.AUDIT_MANAGER_ID = acq.AUDIT_MANAGER_ID
        left join AUDT_CHKL_RFNC acr on acq.CHECKLIST_ID = acr.CHECKLIST_ID and acr.AUDIT_MANAGER_ID = acq.AUDIT_MANAGER_ID
        join AUDIT_MANAGER am on acq.AUDIT_MANAGER_ID = am.AUDIT_MANAGER_ID
        where acq.AUDIT_MANAGER_ID = '${req.params.id}'`;

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
    console.log("Error connecting to Db 208");
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
