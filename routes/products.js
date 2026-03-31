const express = require("express");
const mysql = require("mysql2");
const router = express.Router();

// Helper to create database connection
function createDbConnection() {
  return mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    port: 3306,
    database: "quality",
  });
}

// GET /products - Get all products
router.get("/", (req, res) => {
  const connection = createDbConnection();
  connection.connect((err) => {
    if (err) {
      console.error("DB Connection error:", err);
      res
        .status(500)
        .json({ error: "Database connection failed", details: err.message });
      return;
    }

    const query = "SELECT * FROM PRODUCT ORDER BY PRODUCT_ID";
    connection.query(query, (err, rows) => {
      connection.end();

      if (err) {
        console.error("Query error:", err);
        res
          .status(500)
          .json({ error: "Failed to retrieve products", details: err.message });
        return;
      }

      res.json(rows || []);
    });
  });
});

// GET /products/:productId - Get single product details
router.get("/:productId", (req, res) => {
  const connection = createDbConnection();
  connection.connect((err) => {
    if (err) {
      res.status(500).json({ error: "Database connection failed" });
      return;
    }

    const query = "SELECT * FROM PRODUCT WHERE PRODUCT_ID = ?";
    connection.query(query, [req.params.productId], (err, rows) => {
      connection.end();

      if (err) {
        res.status(500).json({ error: "Failed to retrieve product" });
        return;
      }

      if (!rows || rows.length === 0) {
        res.status(404).json({ error: "Product not found" });
        return;
      }

      res.json(rows[0]);
    });
  });
});

// POST /products - Create new product
router.post("/", (req, res) => {
  const productId = req.body.PRODUCT_ID;
  const name = req.body.NAME || null;
  const status = req.body.STATUS || "C";
  const productType = req.body.PRODUCT_TYPE || null;
  const revisionLevel = req.body.REVISION_LEVEL || null;
  const drawingNumber = req.body.DRAWING_NUMBER || null;
  const reference = req.body.REFERENCE || null;
  const createBy = req.body.CREATE_BY || "SYSTEM";
  const createDate = new Date().toISOString().split("T")[0];

  // Validate required field
  if (!productId) {
    res.status(400).json({ error: "PRODUCT_ID is required" });
    return;
  }

  const connection = createDbConnection();
  connection.connect((err) => {
    if (err) {
      console.error("DB Connection error:", err);
      res.status(500).json({ error: "Database connection failed" });
      return;
    }

    const query =
      "INSERT INTO PRODUCT (PRODUCT_ID, NAME, STATUS, PRODUCT_TYPE, REVISION_LEVEL, DRAWING_NUMBER, REFERENCE, CREATE_BY, CREATE_DATE) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
    connection.query(
      query,
      [
        productId,
        name,
        status,
        productType,
        revisionLevel,
        drawingNumber,
        reference,
        createBy,
        createDate,
      ],
      (err, result) => {
        connection.end();

        if (err) {
          console.error("Insert error:", err);
          if (err.code === "ER_DUP_ENTRY") {
            res.status(409).json({ error: "Product ID already exists" });
          } else {
            res.status(500).json({ error: "Failed to create product" });
          }
          return;
        }

        res.status(201).json({
          success: true,
          message: "Product created successfully",
          PRODUCT_ID: productId,
        });
      },
    );
  });
});

// PUT /products/:productId - Update product
router.put("/:productId", (req, res) => {
  const productId = req.params.productId;
  const name = req.body.NAME || null;
  const status = req.body.STATUS || "C";
  const productType = req.body.PRODUCT_TYPE || null;
  const revisionLevel = req.body.REVISION_LEVEL || null;
  const drawingNumber = req.body.DRAWING_NUMBER || null;
  const reference = req.body.REFERENCE || null;
  const modifiedBy = req.body.MODIFIED_BY || "SYSTEM";
  const modifiedDate = new Date().toISOString().split("T")[0];

  // Validate required fields
  if (!productId) {
    res.status(400).json({ error: "PRODUCT_ID is required" });
    return;
  }

  if (!status) {
    res.status(400).json({ error: "STATUS is required" });
    return;
  }

  const connection = createDbConnection();
  connection.connect((err) => {
    if (err) {
      console.error("DB Connection error:", err);
      res.status(500).json({ error: "Database connection failed" });
      return;
    }

    const query =
      "UPDATE PRODUCT SET NAME = ?, STATUS = ?, PRODUCT_TYPE = ?, REVISION_LEVEL = ?, DRAWING_NUMBER = ?, REFERENCE = ?, MODIFIED_BY = ?, MODIFIED_DATE = ? WHERE PRODUCT_ID = ?";
    connection.query(
      query,
      [
        name,
        status,
        productType,
        revisionLevel,
        drawingNumber,
        reference,
        modifiedBy,
        modifiedDate,
        productId,
      ],
      (err, result) => {
        connection.end();

        if (err) {
          console.error("Update error:", err);
          res.status(500).json({ error: "Failed to update product" });
          return;
        }

        if (result.affectedRows === 0) {
          res.status(404).json({ error: "Product not found" });
          return;
        }

        res.json({
          success: true,
          message: "Product updated successfully",
          PRODUCT_ID: productId,
        });
      },
    );
  });
});

module.exports = router;
