#!/usr/bin/env node

// Test the GET endpoint
const http = require("http");

const options = {
  hostname: "localhost",
  port: 3003,
  path: "/product-char/2152",
  method: "GET",
};

const req = http.request(options, (res) => {
  let data = "";

  res.on("data", (chunk) => {
    data += chunk;
  });

  res.on("end", () => {
    console.log("Status:", res.statusCode);
    try {
      const parsed = JSON.parse(data);
      console.log("\nCharacteristics for product 2152:");
      console.log(JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log("Response:", data);
    }
  });
});

req.on("error", (e) => {
  console.error("Request error:", e.message);
});

req.end();
