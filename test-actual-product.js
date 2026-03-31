#!/usr/bin/env node

// Test the GET endpoint with correct product ID
const http = require("http");

const productId = "2703-3900-400-10";
const options = {
  hostname: "localhost",
  port: 3003,
  path: `/product-char/${encodeURIComponent(productId)}`,
  method: "GET",
};

console.log(`Testing: GET /product-char/${productId}\n`);

const req = http.request(options, (res) => {
  let data = "";

  res.on("data", (chunk) => {
    data += chunk;
  });

  res.on("end", () => {
    console.log("Status:", res.statusCode);
    try {
      const parsed = JSON.parse(data);
      console.log("\nCharacteristics returned:");
      console.log(JSON.stringify(parsed, null, 2));

      if (parsed.length > 0) {
        console.log("\n✅ Success - API returned the characteristics!");
      } else {
        console.log("\n❌ API returned empty array");
      }
    } catch (e) {
      console.log("Response:", data);
    }
  });
});

req.on("error", (e) => {
  console.error("Request error:", e.message);
});

req.end();
