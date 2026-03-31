#!/usr/bin/env node

/**
 * Setup script for PRODUCT_CHAR table
 * Checks and creates SYSTEM_IDS entry if needed
 */

const fs = require("fs");
const path = require("path");

// Load .env file
const envPath = path.join(__dirname, ".env");
const envContent = fs.readFileSync(envPath, "utf8");
const envVars = {};

envContent.split("\n").forEach((line) => {
  const [key, value] = line.split("=");
  if (key && value) {
    envVars[key.trim()] = value.trim();
  }
});

const mysql = require("mysql2");

const connection = mysql.createConnection({
  host: envVars.DB_HOST || "localhost",
  user: envVars.DB_USER || "root",
  password: envVars.DB_PASS || "",
  port: 3306,
  database: "quality",
});

connection.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err.message);
    process.exit(1);
  }

  console.log("✓ Connected to database");

  // Check if SYSTEM_IDS entry exists for PRODUCT_CHAR
  const checkQuery =
    'SELECT * FROM SYSTEM_IDS WHERE TABLE_NAME = "PRODUCT_CHAR"';

  connection.query(checkQuery, (err, rows) => {
    if (err) {
      console.error("Query failed:", err.message);
      connection.end();
      process.exit(1);
    }

    if (rows && rows.length > 0) {
      console.log("✓ SYSTEM_IDS entry for PRODUCT_CHAR already exists");
      console.log(`  Current ID: ${rows[0].CURRENT_ID}`);
      connection.end();
      process.exit(0);
    }

    // Entry doesn't exist, create it
    console.log("⚠ SYSTEM_IDS entry for PRODUCT_CHAR not found, creating...");

    const insertQuery = `
      INSERT INTO SYSTEM_IDS (TABLE_NAME, CURRENT_ID)
      VALUES ('PRODUCT_CHAR', 0)
    `;

    connection.query(insertQuery, (err) => {
      if (err) {
        console.error("Insert failed:", err.message);
        connection.end();
        process.exit(1);
      }

      console.log(
        "✓ Created SYSTEM_IDS entry for PRODUCT_CHAR with CURRENT_ID = 0",
      );
      connection.end();
      process.exit(0);
    });
  });
});
