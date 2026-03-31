#!/usr/bin/env node

/**
 * Test the /product-char POST endpoint
 */

const http = require("http");

// Test data
const testData = {
  PRODUCT_ID: "2152",
  CHAR_NO: "0000001",
  REVISION_LEVEL: "A",
  NAME: "API Test - OD 1.000",
  TYPE: "OD",
  UNITS: "INCH",
  NOMINAL: 1.0,
  LOWER: 0.998,
  UPPER: 1.002,
  CREATE_BY: "TEST_USER",
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
    console.log("Status:", res.statusCode);
    console.log("Response:", data);
    try {
      const parsed = JSON.parse(data);
      console.log("\nParsed response:");
      console.log(JSON.stringify(parsed, null, 2));
    } catch (e) {
      // Not JSON
    }
  });
});

req.on("error", (e) => {
  console.error("Request error:", e.message);
});

console.log("Sending POST request to /product-char with test data:");
console.log(JSON.stringify(testData, null, 2));
console.log("\n");

req.write(JSON.stringify(testData));
req.end();
