#!/usr/bin/env node

/**
 * List products in PRODUCT table
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

  // Get a few products
  const query = "SELECT PRODUCT_ID FROM PRODUCT LIMIT 20";
  connection.query(query, (err, rows) => {
    if (err) {
      console.error("Query error:", err.message);
      connection.end();
      process.exit(1);
    }

    console.log("Products in PRODUCT table:");
    rows.forEach((row) => {
      console.log(`  - ${row.PRODUCT_ID}`);
    });

    // Test with the first product
    if (rows.length > 0) {
      const testProductId = rows[0].PRODUCT_ID;
      console.log(`\nTesting with first product: ${testProductId}`);

      // Check if it has any characteristics
      const charQuery =
        "SELECT COUNT(*) as charCount FROM PRODUCT_CHAR WHERE PRODUCT_ID = ?";
      connection.query(charQuery, [testProductId], (err, results) => {
        if (err) {
          console.error("Char query error:", err.message);
        } else {
          console.log(`  Existing characteristics: ${results[0].charCount}`);
        }

        connection.end();
      });
    } else {
      console.log("No products found!");
      connection.end();
    }
  });
});
