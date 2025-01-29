// import { getUserValue } from './utils.mjs';
require('dotenv').config();
// sequelize...

const express = require('express');
const router = express.Router();
const mysql = require('mysql');


// ==================================================
// Get all records Preventive Maintenance
router.get('/pm', (req, res) => {
    try {
        const connection = mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            port: 3306,
            database: 'quality'
        });
        connection.connect(function(err) {
            if (err) {
                console.error('Error connecting: ' + err.stack);
                return;
            }
        // console.log('Connected to DB');

        const query = `select pi.INPUT_ID, pi.INPUT_DATE, pi.SUBJECT, pi.ASSIGNED_TO, rcr.FREQUENCY, pir.RESPONSE_TEXT from PEOPLE_INPUT pi 
left join PPL_INPT_RSPN pir on pi.INPUT_ID = pir.INPUT_ID 
left join PPL_INPT_RCUR rcr on pi.SUBJECT = rcr.SUBJECT
where pi.SUBJECT REGEXP 'PM(0|1|2)[0-9]{1}' and INPUT_DATE <= current_date() and rcr.STATUS = 'A' and pi.ASSIGNED_TO != 'TKENT'
order by pi.SUBJECT`;
        
        connection.query(query, (err, rows, fields) => {
            if (err) {
                console.log('Failed to query for reports: ' + err);
                res.sendStatus(500);
                return;
            }
            res.json(rows);
        });

        connection.end();
        });
    
    } catch (err) {
        console.log('Error connecting to Db');
        return;
    }

});

// ==================================================
// Get all records Training
router.get("/cta", (req, res) => {
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
  
        const currentYear = new Date().getFullYear();
        // const query = `SELECT COURSE_ATND_ID, COURSE_ID, DATE_TIME, PEOPLE_ID, INSTRUCTOR, MINUTES from CTA_ATTENDANCE WHERE YEAR(DATE_TIME) = ${currentYear} ORDER BY DATE_TIME DESC;`;
        const query = `SELECT COURSE_ATND_ID, COURSE_ID, DATE_TIME, PEOPLE_ID, INSTRUCTOR, MINUTES from CTA_ATTENDANCE ORDER BY DATE_TIME DESC;`;
        connection.query(query, (err, rows, fields) => {
          if (err) {
            console.log("Failed to query for reports: " + err);
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

  // ==================================================
// Get all records OFI
router.get("/ofi", (req, res) => {
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
  
        const currentYear = new Date().getFullYear();
        const lastYear = currentYear - 1;
        // const query = `SELECT pi.INPUT_DATE, pi.INPUT_ID, PEOPLE_ID, SUBJECT, pit.INPUT_TEXT from PEOPLE_INPUT pi left join PPL_INPT_TEXT pit on pi.INPUT_ID = pit.INPUT_ID WHERE YEAR(INPUT_DATE) = ${lastYear} and INPUT_TYPE = 'OPPR' ORDER BY INPUT_ID DESC;`;
        const query = `SELECT pi.INPUT_DATE, pi.INPUT_ID, PEOPLE_ID, SUBJECT, pit.INPUT_TEXT, CLOSED from PEOPLE_INPUT pi left join PPL_INPT_TEXT pit on pi.INPUT_ID = pit.INPUT_ID WHERE INPUT_TYPE = 'OPPR' ORDER BY INPUT_ID DESC;`;
        connection.query(query, (err, rows, fields) => {
          if (err) {
            console.log("Failed to query for reports: " + err);
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

  // ==================================================
// Get all records sysdoc
router.get("/sysdoc", (req, res) => {
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

      const currentYear = new Date().getFullYear();
      const query = `SELECT REQUEST_ID, REQUEST_DATE, ASSIGNED_TO, DUE_DATE, DOCUMENT_ID, CHANGE_TYPE, CHANGE_REASON, PRIORITY, DECISION, DECISION_DATE, CLOSED, CLOSED_DATE FROM quality.DOCM_CHNG_RQST WHERE (YEAR(REQUEST_DATE) = ${currentYear} OR YEAR(CLOSED) = ${currentYear}) OR (YEAR(REQUEST_DATE) < ${currentYear} AND CLOSED = 'N') ORDER BY REQUEST_DATE DESC;`;

      connection.query(query, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for reports: " + err);
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
  

module.exports = router;