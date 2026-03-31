#!/usr/bin/env node

/**
 * Initialize PRODUCT_CHAR table setup
 * Creates SYSTEM_IDS entry and starts the server
 */

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

// Load .env file
const envPath = path.join(__dirname, ".env");
let envVars = {};

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  envContent.split("\n").forEach((line) => {
    const [key, value] = line.split("=");
    if (key && value && !key.startsWith("#")) {
      envVars[key.trim()] = value.trim().replace(/^["']|["']$/g, "");
    }
  });
}

// Try to load mysql2
let mysql;
try {
  mysql = require("mysql2");
} catch (e) {
  console.error("ERROR: mysql2 module not found. Run 'npm install' first.");
  process.exit(1);
}

console.log("🔍 Initializing PRODUCT_CHAR setup...");
console.log(`📦 Database: ${envVars.DB_HOST}`);

const connection = mysql.createConnection({
  host: envVars.DB_HOST || "localhost",
  user: envVars.DB_USER || "root",
  password: envVars.DB_PASS || "",
  port: 3306,
  database: "quality",
});

connection.connect((err) => {
  if (err) {
    console.error("❌ Database connection failed:", err.code, "-", err.message);
    console.error(
      "\n⚠️  Check your .env file has correct database credentials:",
    );
    console.error("   DB_HOST, DB_USER, DB_PASS");
    process.exit(1);
  }

  console.log("✓ Connected to database");

  // Check if SYSTEM_IDS entry exists for PRODUCT_CHAR
  const checkQuery =
    'SELECT * FROM SYSTEM_IDS WHERE TABLE_NAME = "PRODUCT_CHAR"';

  connection.query(checkQuery, (err, rows) => {
    if (err) {
      console.error("❌ Query failed:", err.message);
      connection.end();
      process.exit(1);
    }

    if (rows && rows.length > 0) {
      console.log(
        "✓ SYSTEM_IDS entry for PRODUCT_CHAR already exists (ID: " +
          rows[0].CURRENT_ID +
          ")",
      );
      connection.end();
      startServer();
      return;
    }

    // Entry doesn't exist, create it
    console.log("⚠️  SYSTEM_IDS entry for PRODUCT_CHAR not found, creating...");

    const insertQuery = `
      INSERT INTO SYSTEM_IDS (TABLE_NAME, CURRENT_ID)
      VALUES ('PRODUCT_CHAR', 0)
    `;

    connection.query(insertQuery, (err) => {
      if (err) {
        console.error("❌ Insert failed:", err.message);
        connection.end();
        process.exit(1);
      }

      console.log(
        "✓ Created SYSTEM_IDS entry for PRODUCT_CHAR with CURRENT_ID = 0",
      );
      connection.end();
      startServer();
    });
  });
});

function startServer() {
  console.log("\n📶 Starting development server...");
  console.log("🌐 Server will be available at: http://localhost:3003");
  console.log(
    "📝 Product Characteristics page: http://localhost:3003/product-char.html",
  );
  console.log("");

  // Start the server directly
  const serverProcess = spawn("node", ["--env-file=.env", "server.js"], {
    stdio: "inherit",
    cwd: __dirname,
  });

  serverProcess.on("error", (err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });

  serverProcess.on("exit", (code) => {
    if (code !== 0) {
      console.error(`Server exited with code ${code}`);
    }
    process.exit(code);
  });
}
