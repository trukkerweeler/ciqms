const express = require("express");
const router = express.Router();
const mysql = require("mysql2");

// Monthly P&L Summary route
router.post("/monthly-summary", (req, res) => {
  const targetYear = req.body.year;
  if (!targetYear || isNaN(targetYear)) {
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
						DATE_FORMAT(gd.POST_DATE, '%Y-%m') AS Month,
						CASE 
								WHEN gd.GL_ACCOUNT BETWEEN 400 AND 499 THEN 'Revenue'
								WHEN gd.GL_ACCOUNT BETWEEN 500 AND 599 THEN 'COGS'
								WHEN gd.GL_ACCOUNT BETWEEN 600 AND 799 THEN 'SG&A'
								WHEN gd.GL_ACCOUNT BETWEEN 445 AND 447 OR gd.GL_ACCOUNT BETWEEN 707 AND 750 THEN 'Other Income/Expense'
								WHEN gd.GL_ACCOUNT BETWEEN 900 AND 999 THEN 'Taxes'
								ELSE 'Unclassified'
						END AS Category,
						SUM(gd.AMOUNT) AS Total
				FROM global.GL_DETAIL gd
				WHERE YEAR(gd.POST_DATE) = ?
				AND gd.GL_ACCOUNT >= 400
				GROUP BY Month, Category
				ORDER BY Month, FIELD(Category, 'Revenue', 'COGS', 'SG&A', 'Other Income/Expense', 'Taxes')
			`;
      connection.query(query, [targetYear], (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for P&L summary: " + err);
          res.sendStatus(500);
          return;
        }
        res.json(rows);
      });
      connection.end();
    });
  } catch (err) {
    console.log("Error connecting to Db for P&L summary");
    return res.sendStatus(500);
  }
});

module.exports = router;
