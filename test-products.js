#!/usr/bin/env node

const http = require("http");

const options = {
  hostname: "localhost",
  port: 3003,
  path: "/products",
  method: "GET",
};

console.log("Testing: GET /products\n");

const req = http.request(options, (res) => {
  let data = "";

  res.on("data", (chunk) => {
    data += chunk;
  });

  res.on("end", () => {
    console.log("Status:", res.statusCode);
    try {
      const parsed = JSON.parse(data);
      console.log(`✓ Products returned: ${parsed.length}`);
      if (parsed.length > 0) {
        console.log(
          `First product: ${parsed[0].PRODUCT_NAME} (${parsed[0].PRODUCT_ID})`,
        );
      }
    } catch (e) {
      console.log("Error parsing response");
    }
  });
});

req.on("error", (e) => {
  console.error("Request error:", e.message);
});

req.end();
