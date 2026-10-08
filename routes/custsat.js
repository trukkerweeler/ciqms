const express = require("express");
const router = express.Router();
const mysql = require("mysql2");

// ==================================================
// Customer satisfaction data from NINETYONETWENTY
// period=rolling12 (default): last 12 months
// period=prev-cy: previous calendar year
router.get("/", (req, res) => {
  const period = req.query.period === "prev-cy" ? "prev-cy" : "rolling12";

  let where;
  let params = [];
  if (period === "prev-cy") {
    const prevYear = new Date().getFullYear() - 1;
    where = "SAMPLE_DATE >= ? AND SAMPLE_DATE < ?";
    params = [`${prevYear}-01-01`, `${prevYear + 1}-01-01`];
  } else {
    where = "SAMPLE_DATE >= DATE_SUB(NOW(), INTERVAL 12 MONTH)";
  }

  const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    port: 3306,
    database: "quality",
  });

  connection.connect((err) => {
    if (err) {
      console.error("Error connecting: " + err.stack);
      return res.status(500).json({ error: "Database connection failed" });
    }

    const query = `SELECT CUSTOMER_ID, UNIT, VALUE,
        DATE_FORMAT(SAMPLE_DATE, '%Y-%m-%d') AS SAMPLE_DATE
      FROM NINETYONETWENTY
      WHERE ${where}
      ORDER BY CUSTOMER_ID, UNIT, SAMPLE_DATE`;

    connection.query(query, params, (err, rows) => {
      connection.end();
      if (err) {
        console.log("Failed to query NINETYONETWENTY: " + err);
        return res.status(500).json({ error: "Failed to load data" });
      }

      // Drop rows with a missing date or non-numeric value
      const cleaned = rows
        .map((r) => ({
          customerId: r.CUSTOMER_ID,
          unit: r.UNIT,
          value: r.VALUE === null || r.VALUE === "" ? NaN : Number(r.VALUE),
          sampleDate: r.SAMPLE_DATE,
        }))
        .filter((r) => r.sampleDate && Number.isFinite(r.value));

      res.json({ period, rows: cleaned });
    });
  });
});

module.exports = router;
