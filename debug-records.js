#!/usr/bin/env node

const mysql = require("mysql2");
const c = mysql.createConnection({
  host: "ciqms.chgubqsqxrvz.us-east-2.rds.amazonaws.com",
  user: "admin",
  password: "$4Aws36009",
  database: "quality",
});

c.connect(() => {
  // Get all records with exact values shown
  c.query(
    "SELECT PRODUCT_ID, CHAR_NO, NAME, REVISION_LEVEL, CREATE_BY FROM PRODUCT_CHAR",
    (e, rows) => {
      if (e) {
        console.error("Query error:", e.message);
        c.end();
        return;
      }

      console.log(`\nTotal records in PRODUCT_CHAR: ${rows.length}\n`);

      if (rows.length > 0) {
        console.log("Records:");
        rows.forEach((row) => {
          console.log(
            `\n  PRODUCT_ID: '${row.PRODUCT_ID}' (length: ${row.PRODUCT_ID.length})`,
          );
          console.log(`  CHAR_NO: '${row.CHAR_NO}'`);
          console.log(`  NAME: '${row.NAME}'`);
          console.log(`  REVISION_LEVEL: '${row.REVISION_LEVEL}'`);
          console.log(`  CREATE_BY: '${row.CREATE_BY}'`);
        });

        // Now test fetching by PRODUCT_ID
        const testId = rows[0].PRODUCT_ID;
        console.log(`\n\nTesting fetch with PRODUCT_ID: '${testId}'`);
        c.query(
          "SELECT * FROM PRODUCT_CHAR WHERE PRODUCT_ID = ?",
          [testId],
          (err, results) => {
            if (err) {
              console.error("Fetch error:", err.message);
            } else {
              console.log(`Results found: ${results.length}`);
            }
            c.end();
          },
        );
      } else {
        console.log("(no records)");
        c.end();
      }
    },
  );
});
