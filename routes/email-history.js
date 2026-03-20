const express = require("express");
const router = express.Router();
const mysql = require("mysql2");
const nodemailer = require("nodemailer");

// Synchronous helper to resolve username to WORK_EMAIL_ADDRESS
function resolveEmailAddressSync(recipientEmail, callback) {
  // If already an email address (contains @), use as-is
  if (recipientEmail && recipientEmail.includes("@")) {
    return callback(recipientEmail);
  }

  // Otherwise, look up the username in PEOPLE table
  const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    port: 3306,
    database: "quality",
  });

  connection.connect((err) => {
    if (err) {
      console.error("Error connecting to resolve email:", err.stack);
      return callback(process.env.EMAIL_QM || "tim.kent@ci-aviation.com");
    }

    connection.query(
      "SELECT WORK_EMAIL_ADDRESS FROM PEOPLE WHERE PEOPLE_ID = ?",
      [recipientEmail],
      (err, rows) => {
        connection.end();

        if (err || !rows || rows.length === 0) {
          console.warn(
            `Could not resolve email for username: ${recipientEmail}`,
          );
          return callback(process.env.EMAIL_QM || "tim.kent@ci-aviation.com");
        }

        const resolvedEmail = rows[0].WORK_EMAIL_ADDRESS;
        if (!resolvedEmail) {
          console.warn(`No WORK_EMAIL_ADDRESS for username: ${recipientEmail}`);
          return callback(process.env.EMAIL_QM || "tim.kent@ci-aviation.com");
        }

        callback(resolvedEmail);
      },
    );
  });
}

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
  const {
    app_module,
    app_id,
    recipient_email, // Frontend sends username here
    subject,
    email_body,
    sent_by,
    email_status = "SENT",
    email_type,
    notes,
  } = req.body;

  // Resolve email address synchronously BEFORE storing
  resolveEmailAddressSync(recipient_email, (resolvedEmail) => {
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

      const sentDate = new Date().toISOString().slice(0, 19).replace("T", " ");

      // Store BOTH username (for audit) and resolved email (for sending)
      const query =
        "INSERT INTO EMAIL_HISTORY (APP_MODULE, APP_ID, ASSIGNED_TO, RECIPIENT_EMAIL, SUBJECT, EMAIL_BODY, SENT_BY, SENT_DATE, EMAIL_STATUS, EMAIL_TYPE, NOTES) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

      connection.query(
        query,
        [
          app_module,
          app_id,
          recipient_email, // Store the original username for audit trail
          resolvedEmail, // Store the resolved email address for sending
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

          const emailId = result.insertId;
          connection.end();

          // Return immediately with success
          res.json({ email_id: emailId, success: true });

          // Send email asynchronously (email is already resolved)
          setImmediate(() => {
            sendEmailAsync(emailId, resolvedEmail, subject, email_body);
          });
        },
      );
    });
  });
});

// Helper function to send email asynchronously
function sendEmailAsync(emailId, recipientEmail, subject, emailBody) {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false, // Allow self-signed certificates
      },
    });

    const bccList = [process.env.EMAIL_QM || "tim.kent@ci-aviation.com"];

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: recipientEmail, // Use already-resolved email
      cc: process.env.EMAIL_QM || "",
      subject: subject,
      text: emailBody,
      bcc: bccList,
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error("SMTP Error:", err);
        updateEmailError(emailId, err.message);
      } else {
        console.log("Email sent successfully:", info.messageId);
      }
    });
  } catch (emailErr) {
    console.error("SMTP transport error:", emailErr);
    updateEmailError(emailId, emailErr.message);
  }
}

// Helper function to update email record with error status
function updateEmailError(emailId, errorMessage) {
  const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    port: 3306,
    database: "quality",
  });

  connection.connect((err) => {
    if (err) {
      console.error("Error connecting to update email error:", err.stack);
      return;
    }

    const truncatedError = errorMessage.substring(0, 255);
    const updateQuery =
      "UPDATE EMAIL_HISTORY SET EMAIL_STATUS = ?, ERROR_MESSAGE = ? WHERE EMAIL_ID = ?";

    connection.query(
      updateQuery,
      ["FAILED", truncatedError, emailId],
      (err) => {
        if (err) {
          console.error("Failed to update email error status:", err);
        } else {
          console.log("Email error status updated for ID:", emailId);
        }
        connection.end();
      },
    );
  });
}

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
