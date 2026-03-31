#!/usr/bin/env node

const mysql = require("mysql2");
const c = mysql.createConnection({
  host: "ciqms.chgubqsqxrvz.us-east-2.rds.amazonaws.com",
  user: "admin",
  password: "$4Aws36009",
  database: "quality",
});

c.connect(() => {
  c.query(
    "SELECT * FROM PRODUCT_CHAR WHERE PRODUCT_ID = ?",
    ["2152"],
    (e, r) => {
      if (e) {
        console.error(e.message);
      } else {
        console.log(`\n✅ Records found for product 2152: ${r.length}\n`);
        r.forEach((row) => {
          console.log(`  CHAR_NO: ${row.CHAR_NO}`);
          console.log(`  NAME: ${row.NAME}`);
          console.log(`  TYPE: ${row.TYPE}`);
          console.log(`  UNITS: ${row.UNITS}`);
          console.log(`  NOMINAL: ${row.NOMINAL}`);
          console.log(`  CREATE_BY: ${row.CREATE_BY}`);
          console.log(`  CREATE_DATE: ${row.CREATE_DATE}`);
          console.log("");
        });
      }
      c.end();
    },
  );
});
