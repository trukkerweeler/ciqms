#!/usr/bin/env node

const http = require("http");

const options = {
  hostname: "localhost",
  port: 3003,
  path: "/product-char/search/2703",
  method: "GET",
};

console.log("Testing: GET /product-char/search/2703\n");

const req = http.request(options, (res) => {
  let data = "";

  res.on("data", (chunk) => {
    data += chunk;
  });

  res.on("end", () => {
    console.log("Status:", res.statusCode);
    try {
      const parsed = JSON.parse(data);
      console.log(`Records returned: ${parsed.length}`);
    } catch (e) {
      console.log("Response:", data.substring(0, 500));
    }
  });
});

req.on("error", (e) => {
  console.error("Request error:", e.message);
});

req.end();
