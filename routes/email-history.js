const express = require("express");
const router = express.Router();
const mysql = require("mysql2");

// GET email history with filters
router.get("/", (req, res) => {
  const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    port: 3306,
    database: "quality",
  });

  connection.connect((err) => {
    if (err) {
      console.error("Error connecting:", err.stack);
      connection.end();
      return res.sendStatus(500);
    }

    const appModule = req.query.app_module;
    const appId = req.query.app_id;
    const emailType = req.query.email_type;
    const limit = req.query.limit || 100;

    let query = "SELECT * FROM EMAIL_HISTORY WHERE 1=1";
    const params = [];

    if (appModule) {
      query += " AND APP_MODULE = ?";
      params.push(appModule);
    }

    if (appId) {
      query += " AND APP_ID = ?";
      params.push(appId);
    }

    if (emailType) {
      query += " AND EMAIL_TYPE = ?";
      params.push(emailType);
    }

    query += " ORDER BY SENT_DATE DESC LIMIT ?";
    params.push(parseInt(limit));

    connection.query(query, params, (err, rows) => {
      if (err) {
        console.error("Query failed:", err);
        connection.end();
        return res.sendStatus(500);
      }
      res.json(rows);
      connection.end();
    });
  });
});

// GET single record by email ID
router.get("/:id", (req, res) => {
  const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    port: 3306,
    database: "quality",
  });

  connection.connect((err) => {
    if (err) {
      console.error("Error connecting:", err.stack);
      connection.end();
      return res.sendStatus(500);
    }

    connection.query(
      "SELECT * FROM EMAIL_HISTORY WHERE EMAIL_ID = ?",
      [req.params.id],
      (err, rows) => {
        if (err) {
          console.error("Query failed:", err);
          connection.end();
          return res.sendStatus(500);
        }
        res.json(rows);
        connection.end();
      },
    );
  });
});

// POST new email record
router.post("/", (req, res) => {
  const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    port: 3306,
    database: "quality",
  });

  connection.connect((err) => {
    if (err) {
      console.error("Error connecting:", err.stack);
      connection.end();
      return res.sendStatus(500);
    }

    const {
      app_module,
      app_id,
      recipient_email,
      subject,
      email_body,
      sent_by,
      email_status = "SENT",
      email_type,
      notes,
    } = req.body;

    const sentDate = new Date().toISOString().slice(0, 19).replace("T", " ");

    const query =
      "INSERT INTO EMAIL_HISTORY (APP_MODULE, APP_ID, RECIPIENT_EMAIL, SUBJECT, EMAIL_BODY, SENT_BY, SENT_DATE, EMAIL_STATUS, EMAIL_TYPE, NOTES) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

    connection.query(
      query,
      [
        app_module,
        app_id,
        recipient_email,
        subject,
        email_body,
        sent_by,
        sentDate,
        email_status,
        email_type,
        notes,
      ],
      (err, result) => {
        if (err) {
          console.error("Insert failed:", err);
          connection.end();
          return res.sendStatus(500);
        }
        res.json({ email_id: result.insertId, success: true });
        connection.end();
      },
    );
  });
});

// GET last escalation for an entity (for checking escalation status)
router.get("/last-escalation/:appModule/:appId", (req, res) => {
  const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    port: 3306,
    database: "quality",
  });

  connection.connect((err) => {
    if (err) {
      console.error("Error connecting:", err.stack);
      connection.end();
      return res.sendStatus(500);
    }

    connection.query(
      "SELECT * FROM EMAIL_HISTORY WHERE APP_MODULE = ? AND APP_ID = ? AND EMAIL_TYPE = 'ESCALATION' ORDER BY SENT_DATE DESC LIMIT 1",
      [req.params.appModule, req.params.appId],
      (err, rows) => {
        if (err) {
          console.error("Query failed:", err);
          connection.end();
          return res.sendStatus(500);
        }

        if (rows.length === 0) {
          res.json({
            lastEscalation: null,
            needsEscalation: true,
            daysSinceEscalation: null,
          });
          connection.end();
          return;
        }

        const lastEscalation = rows[0];
        const sentDate = new Date(lastEscalation.SENT_DATE);
        const now = new Date();
        const daysSinceEscalation = Math.floor(
          (now - sentDate) / (1000 * 60 * 60 * 24),
        );

        res.json({
          lastEscalation,
          daysSinceEscalation,
          needsEscalation: daysSinceEscalation > 30,
        });
        connection.end();
      },
    );
  });
});

module.exports = router;
