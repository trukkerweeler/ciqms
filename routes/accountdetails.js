const express = require("express");
const router = express.Router();
const mysql = require("mysql2");

// Fetch all GL_MASTER data (cached on client)
router.get("/gl-master", (req, res) => {
  try {
    const connection = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      port: 3306,
      database: "global",
    });

    connection.connect(function (err) {
      if (err) {
        console.error("Error connecting: " + err.stack);
        return res.sendStatus(500);
      }

      const query = `
        SELECT 
          GL_ACCOUNT,
          DESCR
        FROM global.GL_MASTER
        ORDER BY GL_ACCOUNT
      `;

      connection.query(query, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query GL_MASTER: " + err);
          res.sendStatus(500);
          return;
        }
        res.json(rows);
      });

      connection.end();
    });
  } catch (err) {
    console.log("Error connecting to Db for GL_MASTER");
    return res.sendStatus(500);
  }
});

// Fetch GL accounts that have transactions for a given year
router.post("/accounts", (req, res) => {
  const { year } = req.body;
  if (!year || isNaN(year)) {
    return res
      .status(400)
      .json({ error: "Missing or invalid year in request body" });
  }

  try {
    const connection = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      port: 3306,
      database: "global",
    });

    connection.connect(function (err) {
      if (err) {
        console.error("Error connecting: " + err.stack);
        return res.sendStatus(500);
      }

      const query = `
        SELECT DISTINCT GL_ACCOUNT
        FROM global.GL_DETAIL
        WHERE YEAR(POST_DATE) = ?
        ORDER BY GL_ACCOUNT
      `;

      connection.query(query, [year], (err, rows, fields) => {
        if (err) {
          console.log("Failed to query accounts for year: " + err);
          res.sendStatus(500);
          return;
        }
        res.json(rows);
      });

      connection.end();
    });
  } catch (err) {
    console.log("Error connecting to Db for accounts");
    return res.sendStatus(500);
  }
});

// Fetch account details for a specific GL_ACCOUNT and year
router.post("/details", (req, res) => {
  const { year, glAccount } = req.body;
  if (!year || isNaN(year) || !glAccount) {
    return res
      .status(400)
      .json({ error: "Missing or invalid year/account in request body" });
  }

  try {
    const connection = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      port: 3306,
      database: "global",
    });

    connection.connect(function (err) {
      if (err) {
        console.error("Error connecting: " + err.stack);
        return res.sendStatus(500);
      }

      const query = `
        SELECT 
          dtl.GL_ACCOUNT,
          mstr.DESCR as ACCOUNT_DESCR,
          dtl.POST_DATE,
          dtl.BATCH_NUM,
          dtl.BATCH_LINE,
          dtl.T_DATE,
          dtl.PERIOD,
          dtl.PERIOD_BEG_DATE,
          dtl.PERIOD_END_DATE,
          dtl.REFERENCE,
          dtl.AMOUNT,
          dtl.DESCR
        FROM global.GL_DETAIL dtl
        LEFT JOIN global.GL_MASTER mstr ON dtl.GL_ACCOUNT = mstr.GL_ACCOUNT
        WHERE dtl.GL_ACCOUNT = ?
        AND YEAR(dtl.POST_DATE) = ?
        ORDER BY dtl.POST_DATE DESC
      `;

      connection.query(query, [glAccount, year], (err, rows, fields) => {
        if (err) {
          console.log("Failed to query account details: " + err);
          res.sendStatus(500);
          return;
        }
        res.json(rows);
      });

      connection.end();
    });
  } catch (err) {
    console.log("Error connecting to Db for account details");
    return res.sendStatus(500);
  }
});

module.exports = router;
