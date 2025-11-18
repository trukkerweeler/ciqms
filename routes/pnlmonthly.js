const express = require("express");
const router = express.Router();
const mysql = require("mysql2");

// Monthly P&L Account Details route
router.post("/account-details", (req, res) => {
  const { year, month } = req.body;
  if (!year || isNaN(year) || !month || isNaN(month)) {
    return res
      .status(400)
      .json({ error: "Missing or invalid year/month in request body" });
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
          gd.GL_ACCOUNT,
          CONCAT(gd.GL_ACCOUNT, ' - ', COALESCE(gm.DESCR, 'Unknown')) AS AccountDisplay,
          CASE 
            WHEN gd.GL_ACCOUNT BETWEEN 400 AND 499 THEN 'Revenue'
            WHEN gd.GL_ACCOUNT BETWEEN 500 AND 599 THEN 'COGS'
            WHEN gd.GL_ACCOUNT BETWEEN 600 AND 799 THEN 'SG&A'
            WHEN gd.GL_ACCOUNT BETWEEN 445 AND 447 OR gd.GL_ACCOUNT BETWEEN 707 AND 750 THEN 'Other Income/Expense'
            WHEN gd.GL_ACCOUNT BETWEEN 900 AND 999 THEN 'Taxes'
            ELSE 'Unclassified'
          END AS Category,
          SUM(gd.AMOUNT) AS Total,
          COUNT(*) AS TransactionCount
        FROM global.GL_DETAIL gd
        LEFT JOIN global.GL_MASTER gm ON gd.GL_ACCOUNT = gm.GL_ACCOUNT
        WHERE YEAR(gd.POST_DATE) = ?
        AND MONTH(gd.POST_DATE) = ?
        AND gd.GL_ACCOUNT >= 400
        GROUP BY gd.GL_ACCOUNT, gm.DESCR, Category
        ORDER BY Category, gd.GL_ACCOUNT
      `;
      connection.query(query, [year, month], (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for P&L account details: " + err);
          res.sendStatus(500);
          return;
        }
        res.json(rows);
      });
      connection.end();
    });
  } catch (err) {
    console.log("Error connecting to Db for P&L account details");
    return res.sendStatus(500);
  }
});

// Monthly P&L Adjustments (Manual GL Entries) route
router.post("/adjustments", (req, res) => {
  const { year, month } = req.body;
  if (!year || isNaN(year) || !month || isNaN(month)) {
    return res
      .status(400)
      .json({ error: "Missing or invalid year/month in request body" });
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
          DATE_FORMAT(POST_DATE, '%Y-%m') AS Month,
          GL_ACCOUNT,
          POST_DATE,
          BATCH_NUM,
          BATCH_LINE,
          T_DATE,
          REFERENCE,
          AMOUNT,
          DB_CR_FLAG,
          DESCR,
          VENDOR,
          AR_CODE
        FROM global.GL_DETAIL_MANUAL
        WHERE YEAR(POST_DATE) = ?
        AND MONTH(POST_DATE) = ?
        AND GL_ACCOUNT >= 400
        ORDER BY POST_DATE, GL_ACCOUNT
      `;
      connection.query(query, [year, month], (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for P&L adjustments: " + err);
          res.sendStatus(500);
          return;
        }
        res.json(rows);
      });
      connection.end();
    });
  } catch (err) {
    console.log("Error connecting to Db for P&L adjustments");
    return res.sendStatus(500);
  }
});

// GET route for GL Account transaction details
router.post("/account-transactions", (req, res) => {
  const { year, month, glAccount } = req.body;
  if (!year || isNaN(year) || !month || isNaN(month) || !glAccount) {
    return res
      .status(400)
      .json({ error: "Missing or invalid parameters in request body" });
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
          gd.POST_DATE,
          gd.BATCH_NUM,
          gd.BATCH_LINE,
          gd.REFERENCE,
          gd.AMOUNT,
          gd.DESCR,
          gd.VENDOR,
          gd.APPL_TYPE,
          gd.TRAN_TYPE,
          gd.INVOICE_NO
        FROM global.GL_DETAIL gd
        WHERE YEAR(gd.POST_DATE) = ?
        AND MONTH(gd.POST_DATE) = ?
        AND gd.GL_ACCOUNT = ?
        ORDER BY gd.POST_DATE, gd.BATCH_NUM, gd.BATCH_LINE
      `;
      connection.query(query, [year, month, glAccount], (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for GL account transactions: " + err);
          res.sendStatus(500);
          return;
        }
        res.json(rows);
      });
      connection.end();
    });
  } catch (err) {
    console.log("Error connecting to Db for GL account transactions");
    return res.sendStatus(500);
  }
});

// DELETE route to remove a manual GL entry
router.delete("/adjustments/:batch_num/:batch_line", (req, res) => {
  const { batch_num, batch_line } = req.params;

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
        DELETE FROM global.GL_DETAIL_MANUAL
        WHERE BATCH_NUM = ? AND BATCH_LINE = ?
      `;

      connection.query(query, [batch_num, batch_line], (err, result) => {
        if (err) {
          console.log("Failed to delete manual GL entry: " + err);
          connection.end();
          return res.sendStatus(500);
        }

        if (result.affectedRows === 0) {
          connection.end();
          return res.status(404).json({ error: "Manual GL entry not found" });
        }

        connection.end();
        res.json({ message: "Manual GL entry deleted successfully" });
      });
    });
  } catch (err) {
    console.log("Error connecting to Db for deleting manual GL entry");
    return res.sendStatus(500);
  }
});

module.exports = router;
