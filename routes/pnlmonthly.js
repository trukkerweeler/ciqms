// Ugh
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
        AND (
          (gd.GL_ACCOUNT BETWEEN 400 AND 499 AND gd.DB_CR_FLAG = 'C')
          OR (gd.GL_ACCOUNT BETWEEN 500 AND 999 AND gd.DB_CR_FLAG = 'D')
        )
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
          gd.GL_ACCOUNT,
          gd.POST_DATE,
          gd.BATCH_NUM,
          gd.BATCH_LINE,
          gd.REFERENCE,
          gd.AMOUNT,
          gd.DESCR,
          gd.VENDOR,
          gd.APPL_TYPE,
          gd.TRAN_TYPE,
          gd.INVOICE_NO,
          gd.DB_CR_FLAG
        FROM global.GL_DETAIL gd
        WHERE YEAR(gd.POST_DATE) = ?
        AND MONTH(gd.POST_DATE) = ?
        AND gd.GL_ACCOUNT = ?
        AND (
          (gd.GL_ACCOUNT BETWEEN 400 AND 499 AND gd.DB_CR_FLAG = 'C')
          OR (gd.GL_ACCOUNT >= 500 AND gd.DB_CR_FLAG = 'D')
        )
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

// GET route for yearly P&L trend data (all 12 months)
router.post("/yearly-trend", (req, res) => {
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

      // Query to get monthly P&L summary for all 12 months
      const query = `
        SELECT 
          MONTH(gd.POST_DATE) AS Month,
          CASE 
            WHEN gd.GL_ACCOUNT BETWEEN 400 AND 499 THEN 'Revenue'
            WHEN gd.GL_ACCOUNT BETWEEN 500 AND 599 THEN 'COGS'
            WHEN gd.GL_ACCOUNT BETWEEN 600 AND 799 THEN 'SG&A'
            WHEN (gd.GL_ACCOUNT BETWEEN 445 AND 447 OR gd.GL_ACCOUNT BETWEEN 707 AND 750) THEN 'Other Income/Expense'
            WHEN gd.GL_ACCOUNT BETWEEN 900 AND 999 THEN 'Taxes'
            ELSE NULL
          END AS Category,
          SUM(CASE
            WHEN gd.GL_ACCOUNT BETWEEN 400 AND 499 THEN
              ABS(gd.AMOUNT)
            WHEN (gd.GL_ACCOUNT BETWEEN 445 AND 447 OR gd.GL_ACCOUNT BETWEEN 707 AND 750) THEN
              CASE WHEN gd.DB_CR_FLAG = 'C' THEN ABS(gd.AMOUNT) ELSE -ABS(gd.AMOUNT) END
            ELSE
              CASE WHEN gd.DB_CR_FLAG = 'C' THEN -ABS(gd.AMOUNT) ELSE ABS(gd.AMOUNT) END
          END) AS Total
        FROM global.GL_DETAIL gd
        WHERE YEAR(gd.POST_DATE) = ?
        AND gd.GL_ACCOUNT >= 400
        GROUP BY MONTH(gd.POST_DATE), Category
        ORDER BY Month, Category
      `;

      connection.query(query, [year], (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for yearly P&L trend: " + err);
          connection.end();
          res.sendStatus(500);
          return;
        }

        // Transform raw data into monthly summaries
        const monthlyData = {};
        for (let month = 1; month <= 12; month++) {
          monthlyData[month] = {
            month,
            revenue: 0,
            cogs: 0,
            sga: 0,
            otherExpense: 0,
            taxes: 0,
          };
        }

        // Populate with actual data
        for (const row of rows) {
          if (!row.Month || !row.Category) continue;
          const month = row.Month;
          const amount = Number(row.Total) || 0;

          switch (row.Category) {
            case "Revenue":
              monthlyData[month].revenue += amount;
              break;
            case "COGS":
              monthlyData[month].cogs += amount;
              break;
            case "SG&A":
              monthlyData[month].sga += amount;
              break;
            case "Other Income/Expense":
              monthlyData[month].otherExpense += amount;
              break;
            case "Taxes":
              monthlyData[month].taxes += amount;
              break;
          }
        }

        // Calculate derived metrics
        const result = [];
        for (let month = 1; month <= 12; month++) {
          const m = monthlyData[month];
          const grossProfit = m.revenue - m.cogs;
          const operatingIncome = grossProfit - m.sga;
          const preIncomeExpense = operatingIncome + m.otherExpense;
          const netIncome = preIncomeExpense - m.taxes;

          result.push({
            month,
            revenue: m.revenue,
            cogs: m.cogs,
            grossProfit,
            grossMarginPercent:
              m.revenue !== 0
                ? ((grossProfit / m.revenue) * 100).toFixed(2)
                : 0,
            sga: m.sga,
            operatingIncome,
            operatingMarginPercent:
              m.revenue !== 0
                ? ((operatingIncome / m.revenue) * 100).toFixed(2)
                : 0,
            otherExpense: m.otherExpense,
            taxes: m.taxes,
            netIncome,
            netMarginPercent:
              m.revenue !== 0 ? ((netIncome / m.revenue) * 100).toFixed(2) : 0,
          });
        }

        connection.end();
        res.json(result);
      });
    });
  } catch (err) {
    console.log("Error connecting to Db for yearly P&L trend");
    return res.sendStatus(500);
  }
});

// Route to get yearly adjustments from GL_DETAIL_MANUAL (for Adjusted GL view)
router.post("/yearly-adjustments", (req, res) => {
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

      // Query to get monthly adjustments from GL_DETAIL_MANUAL
      const query = `
        SELECT 
          MONTH(gdm.POST_DATE) AS Month,
          CASE 
            WHEN gdm.GL_ACCOUNT BETWEEN 400 AND 499 THEN 'Revenue'
            WHEN gdm.GL_ACCOUNT BETWEEN 500 AND 599 THEN 'COGS'
            WHEN gdm.GL_ACCOUNT BETWEEN 600 AND 799 THEN 'SG&A'
            WHEN (gdm.GL_ACCOUNT BETWEEN 445 AND 447 OR gdm.GL_ACCOUNT BETWEEN 707 AND 750) THEN 'Other Income/Expense'
            WHEN gdm.GL_ACCOUNT BETWEEN 900 AND 999 THEN 'Taxes'
            ELSE NULL
          END AS Category,
          SUM(CASE
            WHEN gdm.GL_ACCOUNT BETWEEN 400 AND 499 THEN
              ABS(gdm.AMOUNT)
            WHEN (gdm.GL_ACCOUNT BETWEEN 445 AND 447 OR gdm.GL_ACCOUNT BETWEEN 707 AND 750) THEN
              CASE WHEN gdm.DB_CR_FLAG = 'C' THEN ABS(gdm.AMOUNT) ELSE -ABS(gdm.AMOUNT) END
            ELSE
              CASE WHEN gdm.DB_CR_FLAG = 'C' THEN -ABS(gdm.AMOUNT) ELSE ABS(gdm.AMOUNT) END
          END) AS Total
        FROM global.GL_DETAIL_MANUAL gdm
        WHERE YEAR(gdm.POST_DATE) = ?
        AND gdm.GL_ACCOUNT >= 400
        GROUP BY MONTH(gdm.POST_DATE), Category
        ORDER BY Month, Category
      `;

      connection.query(query, [year], (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for yearly adjustments: " + err);
          connection.end();
          res.sendStatus(500);
          return;
        }

        // Transform raw data into monthly summaries
        const monthlyAdjustments = {};
        for (let month = 1; month <= 12; month++) {
          monthlyAdjustments[month] = {
            revenue: 0,
            cogs: 0,
            sga: 0,
            otherExpense: 0,
            taxes: 0,
          };
        }

        // Populate with actual adjustment data
        for (const row of rows) {
          if (!row.Month || !row.Category) continue;
          const month = row.Month;
          const amount = Number(row.Total) || 0;

          switch (row.Category) {
            case "Revenue":
              monthlyAdjustments[month].revenue += amount;
              break;
            case "COGS":
              monthlyAdjustments[month].cogs += amount;
              break;
            case "SG&A":
              monthlyAdjustments[month].sga += amount;
              break;
            case "Other Income/Expense":
              monthlyAdjustments[month].otherExpense += amount;
              break;
            case "Taxes":
              monthlyAdjustments[month].taxes += amount;
              break;
          }
        }

        connection.end();
        res.json(monthlyAdjustments);
      });
    });
  } catch (err) {
    console.log("Error connecting to Db for yearly adjustments");
    return res.sendStatus(500);
  }
});

// GET route for annual P&L trend data (all years)
router.post("/annual-trend", (req, res) => {
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

      // Query to get annual P&L summary for all years
      const query = `
        SELECT 
          YEAR(gd.POST_DATE) AS Year,
          CASE 
            WHEN gd.GL_ACCOUNT BETWEEN 400 AND 499 THEN 'Revenue'
            WHEN gd.GL_ACCOUNT BETWEEN 500 AND 599 THEN 'COGS'
            WHEN gd.GL_ACCOUNT BETWEEN 600 AND 799 THEN 'SG&A'
            WHEN (gd.GL_ACCOUNT BETWEEN 445 AND 447 OR gd.GL_ACCOUNT BETWEEN 707 AND 750) THEN 'Other Income/Expense'
            WHEN gd.GL_ACCOUNT BETWEEN 900 AND 999 THEN 'Taxes'
            ELSE NULL
          END AS Category,
          SUM(CASE
            WHEN gd.GL_ACCOUNT BETWEEN 400 AND 499 THEN
              ABS(gd.AMOUNT)
            WHEN (gd.GL_ACCOUNT BETWEEN 445 AND 447 OR gd.GL_ACCOUNT BETWEEN 707 AND 750) THEN
              CASE WHEN gd.DB_CR_FLAG = 'C' THEN ABS(gd.AMOUNT) ELSE -ABS(gd.AMOUNT) END
            ELSE
              CASE WHEN gd.DB_CR_FLAG = 'C' THEN -ABS(gd.AMOUNT) ELSE ABS(gd.AMOUNT) END
          END) AS Total
        FROM global.GL_DETAIL gd
        WHERE gd.GL_ACCOUNT >= 400
        AND YEAR(gd.POST_DATE) >= 2011
        GROUP BY YEAR(gd.POST_DATE), Category
        ORDER BY Year ASC, Category
      `;

      connection.query(query, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for annual P&L trend: " + err);
          connection.end();
          res.sendStatus(500);
          return;
        }

        // Transform raw data into annual summaries
        const annualData = {};
        for (const row of rows) {
          if (!row.Year || !row.Category) continue;
          const year = row.Year;
          const amount = Number(row.Total) || 0;

          if (!annualData[year]) {
            annualData[year] = {
              year,
              revenue: 0,
              cogs: 0,
              sga: 0,
              otherExpense: 0,
              taxes: 0,
            };
          }

          switch (row.Category) {
            case "Revenue":
              annualData[year].revenue += amount;
              break;
            case "COGS":
              annualData[year].cogs += amount;
              break;
            case "SG&A":
              annualData[year].sga += amount;
              break;
            case "Other Income/Expense":
              annualData[year].otherExpense += amount;
              break;
            case "Taxes":
              annualData[year].taxes += amount;
              break;
          }
        }

        // Calculate derived metrics and sort by year ascending
        const result = [];
        const years = Object.keys(annualData).map(Number).sort();

        for (const year of years) {
          const a = annualData[year];
          const grossProfit = a.revenue - a.cogs;
          const operatingIncome = grossProfit - a.sga;
          const preIncomeExpense = operatingIncome + a.otherExpense;
          const netIncome = preIncomeExpense - a.taxes;

          result.push({
            year,
            revenue: a.revenue,
            cogs: a.cogs,
            grossProfit,
            grossMarginPercent:
              a.revenue !== 0
                ? ((grossProfit / a.revenue) * 100).toFixed(2)
                : 0,
            sga: a.sga,
            operatingIncome,
            operatingMarginPercent:
              a.revenue !== 0
                ? ((operatingIncome / a.revenue) * 100).toFixed(2)
                : 0,
            otherExpense: a.otherExpense,
            taxes: a.taxes,
            netIncome,
            netMarginPercent:
              a.revenue !== 0 ? ((netIncome / a.revenue) * 100).toFixed(2) : 0,
          });
        }

        connection.end();
        res.json(result);
      });
    });
  } catch (err) {
    console.log("Error connecting to Db for annual P&L trend");
    return res.sendStatus(500);
  }
});

// GET route for annual P&L account details (for a specific year)
router.post("/annual-account-details", (req, res) => {
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
          SUM(CASE
            WHEN gd.GL_ACCOUNT BETWEEN 400 AND 499 THEN
              CASE WHEN gd.DB_CR_FLAG = 'C' THEN ABS(gd.AMOUNT) ELSE -ABS(gd.AMOUNT) END
            ELSE
              CASE WHEN gd.DB_CR_FLAG = 'C' THEN -ABS(gd.AMOUNT) ELSE ABS(gd.AMOUNT) END
          END) AS Total,
          COUNT(*) AS TransactionCount
        FROM global.GL_DETAIL gd
        LEFT JOIN global.GL_MASTER gm ON gd.GL_ACCOUNT = gm.GL_ACCOUNT
        WHERE YEAR(gd.POST_DATE) = ?
        AND gd.GL_ACCOUNT >= 400
        GROUP BY gd.GL_ACCOUNT, gm.DESCR, Category
        ORDER BY Category, gd.GL_ACCOUNT
      `;

      connection.query(query, [year], (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for annual account details: " + err);
          res.sendStatus(500);
          return;
        }
        res.json(rows);
      });
      connection.end();
    });
  } catch (err) {
    console.log("Error connecting to Db for annual account details");
    return res.sendStatus(500);
  }
});

// GET route for annual account transaction details
router.post("/annual-account-transactions", (req, res) => {
  const { year, glAccount } = req.body;
  if (!year || isNaN(year) || !glAccount) {
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
          gd.DB_CR_FLAG
        FROM global.GL_DETAIL gd
        WHERE YEAR(gd.POST_DATE) = ?
        AND gd.GL_ACCOUNT = ?
        ORDER BY gd.POST_DATE, gd.BATCH_NUM, gd.BATCH_LINE
      `;
      connection.query(query, [year, glAccount], (err, rows, fields) => {
        if (err) {
          console.log(
            "Failed to query for annual GL account transactions: " + err
          );
          res.sendStatus(500);
          return;
        }
        res.json(rows);
      });
      connection.end();
    });
  } catch (err) {
    console.log("Error connecting to Db for annual GL account transactions");
    return res.sendStatus(500);
  }
});

module.exports = router;
