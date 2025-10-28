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

      const query = `SELECT ca.COURSE_ATND_ID, ca.COURSE_ID, ca.DATE_TIME, ca.PEOPLE_ID, ca.INSTRUCTOR, ca.MINUTES, ca.CREATE_BY, ca.CREATED_DATE, cal.CTA_ATTENDANCE_LINK
        FROM CTA_ATTENDANCE ca
        LEFT JOIN CTA_ATTENDANCE_LINK cal ON ca.COURSE_ATND_ID = cal.COURSE_ATND_ID
        ORDER BY ca.DATE_TIME DESC`;

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

// Get the next ID for a new attendance record
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

      const query =
        'SELECT CURRENT_ID FROM SYSTEM_IDS where TABLE_NAME = "CTA_ATTENDANCE"';
      connection.query(query, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for attendance: " + err);
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
    console.log("Error connecting to Db 83");
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
      // console.log('Connected to DB');

      const query = `insert into CTA_ATTENDANCE (COURSE_ATND_ID
            , COURSE_ID
            , DATE_TIME
            , PEOPLE_ID
            , INSTRUCTOR
            , MINUTES
            , CREATE_BY
            , CREATED_DATE) 
        values 
        (?, ?, ?, ?, ?, ?, ?, ?)`;

      const values = [
        req.body.COURSE_ATND_ID,
        req.body.COURSE_ID,
        req.body.DATE_TIME,
        req.body.PEOPLE_ID,
        req.body.INSTRUCTOR,
        req.body.MINUTES,
        req.body.CREATE_BY,
        req.body.CREATED_DATE,
      ];

      connection.query(query, values, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for attendance insert: " + err);
          res.sendStatus(500);
          connection.end();
          return;
        }

        // If there's a LINK field, insert it into CTA_ATTENDANCE_LINK table
        if (req.body.LINK && req.body.LINK.trim() !== "") {
          const linkQuery = `INSERT INTO CTA_ATTENDANCE_LINK (COURSE_ATND_ID, CTA_ATTENDANCE_LINK) VALUES (?, ?)`;
          const linkValues = [req.body.COURSE_ATND_ID, req.body.LINK];
          // console.log(
          //   "Attempting to insert into CTA_ATTENDANCE_LINK:",
          //   linkQuery,
          //   linkValues
          // );

          connection.query(
            linkQuery,
            linkValues,
            (linkErr, linkRows, linkFields) => {
              if (linkErr) {
                console.log("Failed to insert attendance link: " + linkErr);
                // console.log("Link insert values:", linkValues);
                // Don't fail the whole operation for link insert failure
              } else {
                console.log(
                  "Successfully inserted attendance link:",
                  linkValues
                );
              }
              // After link insert, update SYSTEM_IDS
              const updateQuery = `UPDATE SYSTEM_IDS SET CURRENT_ID = '${req.body.COURSE_ATND_ID}' WHERE TABLE_NAME = 'CTA_ATTENDANCE'`;
              connection.query(updateQuery, (err2, rows2, fields2) => {
                if (err2) {
                  console.log(
                    "Failed to query for attendance system id update: " + err2
                  );
                  res.sendStatus(500);
                  connection.end();
                  return;
                }
                res.json(rows);
                connection.end();
              });
            }
          );
        } else {
          // If no link, just update SYSTEM_IDS
          const updateQuery = `UPDATE SYSTEM_IDS SET CURRENT_ID = '${req.body.COURSE_ATND_ID}' WHERE TABLE_NAME = 'CTA_ATTENDANCE'`;
          connection.query(updateQuery, (err2, rows2, fields2) => {
            if (err2) {
              console.log(
                "Failed to query for attendance system id update: " + err2
              );
              res.sendStatus(500);
              connection.end();
              return;
            }
            res.json(rows);
            connection.end();
          });
        }
      });
    });
  } catch (err) {
    console.log("Error connecting to Db (changes 144)");
    return;
  }
});

// ==================================================
// Get a single record
module.exports = router;
