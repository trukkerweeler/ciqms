const express = require("express");
const router = express.Router();
const mysql = require("mysql2");

// Monthly Order Booking Category Details route
router.post("/category-details", (req, res) => {
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
          COALESCE(PROD_LINE, 'Unassigned') AS CATEGORY,
          SUM(TOTAL_DOLLARS) AS ORDER_VALUE,
          COUNT(*) AS ORDER_COUNT
        FROM ORDER_BOOKING
        WHERE YEAR(DATE_ORDER) = ?
        AND MONTH(DATE_ORDER) = ?
        AND TOTAL_DOLLARS > 0
        GROUP BY PROD_LINE
        ORDER BY PROD_LINE
      `;
      connection.query(
        query,
        [parseInt(year), parseInt(month)],
        (err, rows, fields) => {
          if (err) {
            console.log("Failed to query for order booking details: " + err);
            res.sendStatus(500);
            return;
          }
          res.json(rows);
        }
      );
      connection.end();
    });
  } catch (err) {
    console.log("Error connecting to Db for order booking details");
    return res.sendStatus(500);
  }
});

// Order Booking Category Orders route
router.post("/category-orders", (req, res) => {
  const { year, month, category } = req.body;
  if (!year || isNaN(year) || !month || isNaN(month) || !category) {
    return res.status(400).json({
      error: "Missing or invalid year/month/category in request body",
    });
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
          ORDER_NO AS ORDER_NUMBER,
          DATE_ORDER AS ORDER_DATE,
          CUSTOMER,
          PART AS DESCRIPTION,
          TOTAL_DOLLARS AS ORDER_VALUE
        FROM ORDER_BOOKING
        WHERE YEAR(DATE_ORDER) = ?
        AND MONTH(DATE_ORDER) = ?
        AND (PROD_LINE = ? OR (? = 'Unassigned' AND (PROD_LINE IS NULL OR PROD_LINE = '')))
        AND TOTAL_DOLLARS > 0
        ORDER BY DATE_ORDER DESC, ORDER_NO
      `;
      connection.query(
        query,
        [parseInt(year), parseInt(month), category, category],
        (err, rows, fields) => {
          if (err) {
            console.log("Failed to query for order booking orders: " + err);
            res.sendStatus(500);
            return;
          }
          // Format DATE_ORDER from YYYYMMDD to ISO date
          const formattedRows = rows.map((row) => {
            if (row.ORDER_DATE && typeof row.ORDER_DATE === "string") {
              const dateStr = row.ORDER_DATE.trim();
              if (dateStr.length === 8) {
                row.ORDER_DATE = new Date(
                  `${dateStr.substring(0, 4)}-${dateStr.substring(
                    4,
                    6
                  )}-${dateStr.substring(6, 8)}`
                );
              }
            }
            return row;
          });
          res.json(formattedRows);
        }
      );
      connection.end();
    });
  } catch (err) {
    console.log("Error connecting to Db for order booking orders");
    return res.sendStatus(500);
  }
});

// Yearly Order Booking Trend route
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
      const query = `
        SELECT 
          MONTH(DATE_ORDER) AS MONTH,
          SUM(TOTAL_DOLLARS) AS bookingValue,
          COUNT(*) AS orderCount
        FROM ORDER_BOOKING
        WHERE YEAR(DATE_ORDER) = ?
        AND TOTAL_DOLLARS > 0
        GROUP BY MONTH(DATE_ORDER)
        ORDER BY MONTH
      `;
      connection.query(query, [parseInt(year)], (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for order booking yearly trend: " + err);
          res.sendStatus(500);
          return;
        }

        // Ensure all 12 months are present
        const trendData = [];
        for (let m = 1; m <= 12; m++) {
          const monthData = rows.find((row) => Number(row.MONTH) === m);
          trendData.push({
            month: m,
            bookingValue: monthData ? Number(monthData.bookingValue) : 0,
            orderCount: monthData ? Number(monthData.orderCount) : 0,
          });
        }

        res.json(trendData);
      });
      connection.end();
    });
  } catch (err) {
    console.log("Error connecting to Db for order booking yearly trend");
    return res.sendStatus(500);
  }
});

// YoY comparison data route
router.post("/yoy-data", (req, res) => {
  const { startYear, endYear } = req.body;
  if (
    !startYear ||
    !endYear ||
    isNaN(startYear) ||
    isNaN(endYear) ||
    startYear > endYear
  ) {
    return res.status(400).json({
      error: "Missing or invalid startYear/endYear in request body",
    });
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
          YEAR(DATE_ORDER) AS year,
          MONTH(DATE_ORDER) AS month,
          SUM(TOTAL_DOLLARS) AS total
        FROM ORDER_BOOKING
        WHERE YEAR(DATE_ORDER) >= ?
        AND YEAR(DATE_ORDER) <= ?
        AND TOTAL_DOLLARS > 0
        GROUP BY YEAR(DATE_ORDER), MONTH(DATE_ORDER)
        ORDER BY YEAR(DATE_ORDER), MONTH(DATE_ORDER)
      `;

      connection.query(
        query,
        [parseInt(startYear), parseInt(endYear)],
        (err, rows, fields) => {
          if (err) {
            console.log("Failed to query for YoY booking data: " + err);
            res.sendStatus(500);
            return;
          }

          // Ensure all years and months are present
          const yoyData = [];
          for (
            let year = parseInt(startYear);
            year <= parseInt(endYear);
            year++
          ) {
            for (let month = 1; month <= 12; month++) {
              const record = rows.find(
                (row) =>
                  Number(row.year) === year && Number(row.month) === month
              );
              yoyData.push({
                year: year,
                month: month,
                total: record ? Number(record.total) : 0,
              });
            }
          }

          res.json(yoyData);
        }
      );

      connection.end();
    });
  } catch (err) {
    console.log("Error connecting to Db for YoY booking data");
    return res.sendStatus(500);
  }
});

module.exports = router;
