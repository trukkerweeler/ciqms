#!/usr/bin/env node

const http = require("http");

const options = {
  hostname: "localhost",
  port: 3003,
  path: "/product-char/nextId?productId=2703-3900-400-10",
  method: "GET",
};

console.log("Testing: GET /product-char/nextId?productId=2703-3900-400-10\n");

const req = http.request(options, (res) => {
  let data = "";

  res.on("data", (chunk) => {
    data += chunk;
  });

  res.on("end", () => {
    console.log("Status:", res.statusCode);
    console.log("Response:", data);
  });
});

req.on("error", (e) => {
  console.error("Request error:", e.message);
});

req.end();
