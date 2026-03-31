#!/usr/bin/env node

const mysql = require("mysql2");

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  port: 3306,
  database: "quality",
});

connection.connect((err) => {
  if (err) {
    console.error("Connection failed:", err.message);
    return;
  }

  connection.query("DESC PRODUCT", (err, rows) => {
    if (err) {
      console.error("Query failed:", err.message);
    } else {
      console.log("PRODUCT table columns:");
      rows.forEach((r) => {
        console.log(`  ${r.Field} (${r.Type})`);
      });
    }
    connection.end();
  });
});
