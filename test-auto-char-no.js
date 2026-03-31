#!/usr/bin/env node

const http = require("http");

const testData = {
  PRODUCT_ID: "TEST-AUTO-INC",
  REVISION_LEVEL: "A",
  NAME: "Test Characteristic",
  TYPE: "DIM",
  NOMINAL: 1.0,
  LOWER: 0.9,
  UPPER: 1.1,
};

const options = {
  hostname: "localhost",
  port: 3003,
  path: "/product-char",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
};

console.log("Testing auto-increment CHAR_NO (with confirmWarning):\n");

const req = http.request(options, (res) => {
  let data = "";

  res.on("data", (chunk) => {
    data += chunk;
  });

  res.on("end", () => {
    console.log("Status:", res.statusCode);
    try {
      const parsed = JSON.parse(data);
      console.log("Response:", JSON.stringify(parsed, null, 2));
      if (parsed.CHAR_NO) {
        console.log(`✓ CHAR_NO auto-generated: ${parsed.CHAR_NO}`);
      }
    } catch (e) {
      console.log("Response:", data);
    }
  });
});

req.on("error", (e) => {
  console.error("Request error:", e.message);
});

// Send with confirmWarning=true to skip PRODUCT_ID check
testData.confirmWarning = true;
req.write(JSON.stringify(testData));
req.end();
