const express = require("express");
const mysql = require("mysql2");

const router = express.Router();

// Debug mode flag - set to true to enable console logging
const DEBUG_MODE = false;

// POST route to insert a new GL_DETAIL_MANUAL record
router.post("/", async (req, res) => {
  const {
    GL_ACCOUNT,
    POST_DATE,
    BATCH_NUM,
    BATCH_LINE,
    T_DATE,
    PERIOD,
    PERIOD_BEG_DATE,
    PERIOD_END_DATE,
    REFERENCE,
    AMOUNT,
    DB_CR_FLAG,
    DESCR,
    APPL_TYPE,
    TRAN_TYPE,
    VENDOR,
    AR_CODE,
    INVC_DATE,
  } = req.body;

  if (DEBUG_MODE) {
    console.log("POST /gldetail - Insert GL_DETAIL_MANUAL record", req.body);
  }

  try {
    const connection = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      port: 3306,
      database: "global",
    });

    const query = `
      INSERT INTO GL_DETAIL_MANUAL (
        GL_ACCOUNT,
        POST_DATE,
        BATCH_NUM,
        BATCH_LINE,
        T_DATE,
        PERIOD,
        PERIOD_BEG_DATE,
        PERIOD_END_DATE,
        REFERENCE,
        AMOUNT,
        DB_CR_FLAG,
        DESCR,
        APPL_TYPE,
        TRAN_TYPE,
        VENDOR,
        AR_CODE,
        INVC_DATE
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      GL_ACCOUNT,
      POST_DATE,
      BATCH_NUM,
      BATCH_LINE,
      T_DATE,
      PERIOD,
      PERIOD_BEG_DATE,
      PERIOD_END_DATE,
      REFERENCE,
      AMOUNT,
      DB_CR_FLAG,
      DESCR,
      APPL_TYPE,
      TRAN_TYPE,
      VENDOR,
      AR_CODE,
      INVC_DATE,
    ];

    connection.execute(query, values, (err, result) => {
      if (err) {
        console.error("Failed to insert GL_DETAIL_MANUAL record: " + err);
        connection.end();
        res
          .status(500)
          .json({ error: "Failed to insert record", details: err.message });
        return;
      }
      if (DEBUG_MODE) {
        console.log(`GL_DETAIL_MANUAL record inserted successfully`);
      }
      connection.end();
      res.json({
        message: "GL_DETAIL_MANUAL record created successfully",
        insertId: result.insertId,
      });
    });
  } catch (err) {
    console.error("Error connecting to DB: ", err);
    res
      .status(500)
      .json({ error: "Error connecting to DB", details: err.message });
  }
});

// GET route to retrieve GL_DETAIL_MANUAL records (optional, for verification)
router.get("/", async (req, res) => {
  const { batch_num, period, gl_account } = req.query;

  try {
    const connection = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      port: 3306,
      database: "global",
    });

    let query = "SELECT * FROM GL_DETAIL_MANUAL WHERE 1=1";
    const values = [];

    if (batch_num) {
      query += " AND BATCH_NUM = ?";
      values.push(batch_num);
    }
    if (period) {
      query += " AND PERIOD = ?";
      values.push(period);
    }
    if (gl_account) {
      query += " AND GL_ACCOUNT = ?";
      values.push(gl_account);
    }

    query += " ORDER BY POST_DATE DESC LIMIT 100";

    connection.execute(query, values, (err, rows) => {
      if (err) {
        console.error("Failed to retrieve GL_DETAIL_MANUAL records: " + err);
        connection.end();
        res.status(500).json({ error: "Failed to retrieve records" });
        return;
      }
      connection.end();
      res.json(rows);
    });
  } catch (err) {
    console.error("Error connecting to DB: ", err);
    res.status(500).json({ error: "Error connecting to DB" });
  }
});

// GET route to retrieve a specific GL_DETAIL_MANUAL record by BATCH_NUM and BATCH_LINE
router.get("/:batch_num/:batch_line", async (req, res) => {
  const { batch_num, batch_line } = req.params;

  try {
    const connection = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      port: 3306,
      database: "global",
    });

    const query = `
      SELECT * FROM GL_DETAIL_MANUAL 
      WHERE BATCH_NUM = ? AND BATCH_LINE = ?
    `;

    connection.execute(query, [batch_num, batch_line], (err, rows) => {
      if (err) {
        console.error("Failed to retrieve GL_DETAIL_MANUAL record: " + err);
        connection.end();
        res.status(500).json({ error: "Failed to retrieve record" });
        return;
      }
      if (rows.length === 0) {
        connection.end();
        res.status(404).json({ message: "Record not found" });
        return;
      }
      connection.end();
      res.json(rows[0]);
    });
  } catch (err) {
    console.error("Error connecting to DB: ", err);
    res.status(500).json({ error: "Error connecting to DB" });
  }
});

module.exports = router;
