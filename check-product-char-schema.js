#!/usr/bin/env node

/**
 * Check actual PRODUCT_CHAR table structure
 */

const mysql = require("mysql2");

const connection = mysql.createConnection({
  host: "ciqms.chgubqsqxrvz.us-east-2.rds.amazonaws.com",
  user: "admin",
  password: "$4Aws36009",
  port: 3306,
  database: "quality",
});

connection.connect((err) => {
  if (err) {
    console.error("Connection error:", err.message);
    process.exit(1);
  }

  console.log("✓ Connected to database\n");

  // Get table structure
  const query = "DESCRIBE PRODUCT_CHAR";
  connection.query(query, (err, results) => {
    if (err) {
      console.error("Error:", err.message);
      connection.end();
      process.exit(1);
    }

    console.log("PRODUCT_CHAR table columns:\n");
    console.table(results);

    // Get a sample row if any exist
    const sampleQuery = "SELECT * FROM PRODUCT_CHAR LIMIT 1";
    connection.query(sampleQuery, (err, rows) => {
      if (err) {
        console.error("Sample query error:", err.message);
      } else if (rows.length > 0) {
        console.log("\nSample row:");
        console.log(JSON.stringify(rows[0], null, 2));
      } else {
        console.log("\nNo rows in table yet");
      }

      connection.end();
    });
  });
});
