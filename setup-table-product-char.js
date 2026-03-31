#!/usr/bin/env node

/**
 * Setup script to create PRODUCT_CHAR table
 */

require("dotenv").config({ path: __dirname + "/.env" });
const mysql = require("mysql2");

// Use hardcoded values to bypass dotenv issues
const dbHost = "ciqms.chgubqsqxrvz.us-east-2.rds.amazonaws.com";
const dbUser = "admin";
const dbPass = "$4Aws36009";

console.log(`Attempting connection to: ${dbHost}`);

const connection = mysql.createConnection({
  host: dbHost,
  user: dbUser,
  password: dbPass,
  port: 3306,
  database: "quality",
});

connection.connect((err) => {
  if (err) {
    console.error("❌ Database connection failed:", err.code || err.message);
    if (err.code === "PROTOCOL_CONNECTION_LOST") {
      console.error("Connection was closed");
    }
    if (err.code === "PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR") {
      console.error("Fatal error occurred");
    }
    if (err.code === "PROTOCOL_ENQUEUE_AFTER_AQUIRE_TIMEOUT") {
      console.error("Connection timed out");
    }
    if (err.code === "PROTOCOL_ENQUEUE_BEFORE_HANDSHAKE") {
      console.error("Handshake issue");
    }
    process.exit(1);
  }

  console.log("✓ Connected to database");

  // Create PRODUCT_CHAR table
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS PRODUCT_CHAR (
      PRODUCT_ID VARCHAR(16) NOT NULL,
      CHAR_NO VARCHAR(7) NOT NULL,
      DRAWING_NO VARCHAR(40),
      INSP_PLAN_EQUIP_ID VARCHAR(16),
      NAME VARCHAR(75),
      TYPE VARCHAR(16),
      REVISION_LEVEL VARCHAR(4) NOT NULL,
      ISSUE_DATE DATE,
      STANDARD_TYPE VARCHAR(1),
      VARIABLE_STANDARD VARCHAR(40),
      UNITS VARCHAR(16),
      NOMINAL DECIMAL(12, 6),
      LOWER DECIMAL(12, 6),
      UPPER DECIMAL(12, 6),
      PAGE VARCHAR(3),
      ZONE VARCHAR(6),
      STATUS VARCHAR(1),
      CATEGORY VARCHAR(16),
      CLASS VARCHAR(16),
      INSP_PLAN_EQP_TYPE VARCHAR(16),
      INSP_PLN_SAMP_SIZE INT,
      INSP_PLN_SAMP_PLAN VARCHAR(3),
      INSP_PLAN_AQL VARCHAR(4),
      INSP_PLAN_LEVEL VARCHAR(16),
      INSP_PLAN_DEV_ID VARCHAR(16),
      INSP_PLAN_DEV_TYPE VARCHAR(16),
      INSP_PLAN_CHT_TYPE VARCHAR(16),
      INSP_PLAN_MEAS_BY VARCHAR(16),
      INSP_PLAN_FREQ VARCHAR(16),
      INSP_PLAN_CHART_BY VARCHAR(16),
      SIGNIFICAT_DIGITS VARCHAR(6),
      SAMP_PLAN_ID VARCHAR(16),
      CREATE_BY VARCHAR(50),
      CREATE_DATE TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      MODIFIED_BY VARCHAR(50),
      MODIFIED_DATE TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (PRODUCT_ID, CHAR_NO),
      CONSTRAINT fk_product_char_product FOREIGN KEY (PRODUCT_ID) REFERENCES PRODUCT(PRODUCT_ID)
    )
  `;

  connection.query(createTableQuery, (err) => {
    if (err) {
      console.error("❌ Failed to create PRODUCT_CHAR table:", err.message);
      connection.end();
      process.exit(1);
    }

    console.log("✓ PRODUCT_CHAR table created successfully");

    // Create index for faster queries
    const createIndexQuery =
      "CREATE INDEX IF NOT EXISTS idx_product_char_status ON PRODUCT_CHAR(PRODUCT_ID, STATUS)";

    connection.query(createIndexQuery, (err) => {
      if (err) {
        console.error("⚠️  Warning: Index creation failed:", err.message);
        // Continue despite index failure
      } else {
        console.log("✓ Index created successfully");
      }

      connection.end();
      console.log("✅ PRODUCT_CHAR setup complete!");
      process.exit(0);
    });
  });
});
