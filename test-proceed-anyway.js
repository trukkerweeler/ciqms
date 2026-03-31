#!/usr/bin/env node

/**
 * Test the "Proceed Anyway" flow - send with confirmWarning flag
 */

const http = require("http");

// Test data with confirmWarning flag
const testData = {
  PRODUCT_ID: "2152",
  CHAR_NO: "0000001",
  REVISION_LEVEL: "A",
  NAME: "Test Characteristic - OD 1.000",
  TYPE: "OD",
  UNITS: "INCH",
  NOMINAL: 1.0,
  LOWER: 0.998,
  UPPER: 1.002,
  CREATE_BY: "TEST_USER",
  confirmWarning: true, // THIS is the flag for "Proceed Anyway"
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

const req = http.request(options, (res) => {
  let data = "";

  res.on("data", (chunk) => {
    data += chunk;
  });

  res.on("end", () => {
    console.log("\nStatus:", res.statusCode);
    console.log("Response:", data);
    try {
      const parsed = JSON.parse(data);
      console.log("\nParsed response:");
      console.log(JSON.stringify(parsed, null, 2));

      if (res.statusCode === 200 && parsed.success) {
        console.log("\n✅ SUCCESS - Record was inserted!");
      }
    } catch (e) {
      console.error("JSON parse error:", e.message);
    }
  });
});

req.on("error", (e) => {
  console.error("Request error:", e.message);
});

console.log("Testing 'Proceed Anyway' flow with confirmWarning=true:");
console.log(JSON.stringify(testData, null, 2));

req.write(JSON.stringify(testData));
req.end();
