const express = require("express");
const mysql = require("mysql2/promise");
const router = express.Router();

// Get the next ID for a new record
// Usage: GET /ids?table=PRODUCT_COLLECT or GET /ids (defaults to CALIBRATION for backwards compatibility)
router.get("/", async (req, res) => {
  const tableName = req.query.table || "CALIBRATION";
  const dbName = tableName === "CALIBRATION" ? "calibration" : "quality";

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      port: 3306,
      database: dbName,
    });

    const [rows] = await connection.execute(
      `SELECT CURRENT_ID FROM ${dbName}.SYSTEM_IDS WHERE TABLE_NAME = ?`,
      [tableName],
    );

    if (rows.length === 0) {
      console.log(`No records found in SYSTEM_IDS for ${tableName}`);
      res.status(404).send(`No records found for table ${tableName}`);
      return;
    }

    const nextId = parseInt(rows[0].CURRENT_ID) + 1;
    const dbNextId = nextId.toString().padStart(7, "0");
    res.json(dbNextId);

    await connection.end();
  } catch (err) {
    console.log(`Error fetching ID for ${tableName}:`, err);
    res.sendStatus(500);
  }
});

// Update the next ID in the database
// Usage: POST /ids?table=PRODUCT_COLLECT or POST /ids (defaults to CALIBRATION for backwards compatibility)
router.post("/", async (req, res) => {
  let { nextId } = req.body;
  const tableName = req.query.table || "CALIBRATION";
  const dbName = tableName === "CALIBRATION" ? "calibration" : "quality";

  if (nextId.toString().length < 7) {
    nextId = nextId.toString().padStart(7, "0");
  }

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      port: 3306,
      database: dbName,
    });

    const [result] = await connection.execute(
      `UPDATE ${dbName}.SYSTEM_IDS SET CURRENT_ID = ? WHERE TABLE_NAME = ?`,
      [nextId, tableName],
    );

    if (result.affectedRows === 0) {
      console.log(`No rows updated in SYSTEM_IDS for ${tableName}`);
      res.status(404).send(`No rows updated for table ${tableName}`);
      return;
    }

    res.sendStatus(200);

    await connection.end();
  } catch (err) {
    console.log(`Error updating ID for ${tableName}:`, err);
    res.sendStatus(500);
  }
});

module.exports = router;
