#!/usr/bin/env node

const mysql = require("mysql2");
const c = mysql.createConnection({
  host: "ciqms.chgubqsqxrvz.us-east-2.rds.amazonaws.com",
  user: "admin",
  password: "$4Aws36009",
  database: "quality",
});

c.connect(() => {
  console.log("Checking all records in PRODUCT_CHAR table:\n");
  c.query("SELECT COUNT(*) as totalCount FROM PRODUCT_CHAR", (e, r) => {
    if (e) {
      console.error("Count error:", e.message);
    } else {
      console.log(`Total records: ${r[0].totalCount}`);
    }

    // Get all records
    c.query(
      "SELECT PRODUCT_ID, CHAR_NO, NAME, TYPE FROM PRODUCT_CHAR",
      (e, rows) => {
        if (e) {
          console.error("Query error:", e.message);
        } else {
          console.log(`\nAll records:`);
          if (rows.length === 0) {
            console.log("  (empty table)");
          } else {
            rows.forEach((row) => {
              console.log(
                `  ${row.PRODUCT_ID} / ${row.CHAR_NO}: ${row.NAME} (${row.TYPE})`,
              );
            });
          }
        }

        c.end();
      },
    );
  });
});
