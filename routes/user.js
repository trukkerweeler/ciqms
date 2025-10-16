const express = require("express");
const router = express.Router();
const mysql = require("mysql2");
const bcrypt = require("bcrypt");

// Create a record
router.post("/:id", async (req, res) => {
  try {
    passwordToString = req.body.password.toString();
    const hashedPassword = await bcrypt.hash(passwordToString, 10);
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

      const query = `insert into USERS (
            USER_ID, USER_PWD
        ) values (?, ?)`;
      const values = [req.body.username, hashedPassword];
      connection.query(query, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for USER insert: " + err);
          res.sendStatus(500);
          return;
        }
        res.json(rows);
      });
      connection.end();
    });
  } catch (err) {
    console.log(err);
  }
});

// // verify login credentials
router.post("/login", async (req, res) => {
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
      const query = `select * from USERS where USER_ID = ?`;
      const values = [req.body.username];
      connection.query(query, async (err, rows, fields) => {
        if (err) {
          res.sendStatus(400).send("Cannot connect");
          return;
        }
        if (rows.length == 0) {
          res.sendStatus(400).send("Cannot find user");

          return;
        } else {
          dbuser = rows[0].USER_ID;
          dbpass = rows[0].USER_PWD;
          console.log(dbuser);
          console.log(dbpass);
          // res.json(rows);
          try {
            const passwordMatch = await bcrypt.compare(
              req.body.password,
              dbpass
            );
            if (passwordMatch) {
              res.send("Success");
            } else {
              res.status(500).send("Not Allowed");
            }
          } catch (err) {
            console.log("Error comparing passwords:", err);
            res.status(500).send("Authentication error");
          }
        }
      });
      connection.end();
    });
  } catch (err) {
    console.log(err);
  }
});

module.exports = router;
