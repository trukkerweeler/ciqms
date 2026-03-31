#!/usr/bin/env node

/**
 * Test inserting a record into PRODUCT_CHAR
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

  // Try to insert a test record
  const testRecord = {
    PRODUCT_ID: "TEST-2152",
    CHAR_NO: "0000001",
    NAME: "Test Characteristic",
    TYPE: "Test",
    REVISION_LEVEL: "1.0",
    CREATE_BY: "TEST_USER",
  };

  const insertQuery = `
    INSERT INTO PRODUCT_CHAR (
      PRODUCT_ID, CHAR_NO, NAME, TYPE, REVISION_LEVEL, CREATE_BY, CREATE_DATE
    ) VALUES (?, ?, ?, ?, ?, ?, NOW())
  `;

  const values = [
    testRecord.PRODUCT_ID,
    testRecord.CHAR_NO,
    testRecord.NAME,
    testRecord.TYPE,
    testRecord.REVISION_LEVEL,
    testRecord.CREATE_BY,
  ];

  console.log("Inserting test record:");
  console.log(JSON.stringify(testRecord, null, 2));

  connection.query(insertQuery, values, (err) => {
    if (err) {
      console.error("❌ Insert failed:", err.message);
      console.error("Error code:", err.code);
      connection.end();
      process.exit(1);
    }

    console.log("✓ Insert successful!");

    // Query the inserted record back
    const selectQuery =
      "SELECT * FROM PRODUCT_CHAR WHERE PRODUCT_ID = ? AND CHAR_NO = ?";
    connection.query(
      selectQuery,
      [testRecord.PRODUCT_ID, testRecord.CHAR_NO],
      (err, rows) => {
        if (err) {
          console.error("Query error:", err.message);
        } else if (rows.length > 0) {
          console.log("\n✓ Record verified in database:");
          console.log(JSON.stringify(rows[0], null, 2));
        } else {
          console.log("⚠️  Record not found!");
        }

        connection.end();
      },
    );
  });
});
