// ==================================================
// DOCUMENT CHANGE ROUTER

const express = require("express");
const router = express.Router();
const mysql = require("mysql2");
const nodemailer = require("nodemailer");

// ==================================================
// put response text
router.put("/response/:id", (req, res) => {
  try {
    const connection = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      port: 3306,
      database: "quality",
    });
    connection.connect(function (err) {
      if (err) {
        console.error("Error connecting: " + err.stack);
        return;
      }
      // sql to insert on duplicate key update
      const query = `INSERT INTO DOCM_CHNG_RSPN (REQUEST_ID, RESPONSE_TEXT) VALUES (?, ?) ON DUPLICATE KEY UPDATE RESPONSE_TEXT = ?`;
      const values = [
        req.params.id,
        req.body.RESPONSE_TEXT,
        req.body.RESPONSE_TEXT,
      ];
      connection.query(query, values, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for doc change response text: " + err);
          res.sendStatus(500);
          connection.end();
          return;
        }
        res.json(rows);
        connection.end();
      });
    });
  } catch (err) {
    console.log("Error connecting to Db 42");
    return;
  }
});

// ==================================================
// put request text
router.put("/request/:id", async (req, res) => {
  try {
    const connection = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      port: 3306,
      database: "quality",
    });
    connection.connect(function (err) {
      if (err) {
        console.error("Error connecting: " + err.stack);
        return;
      }
      // sql to insert on duplicate key update
      const query = `INSERT INTO DOC_CHG_REQ_TXT (REQUEST_ID, REQUEST_TEXT) VALUES (?, ?) ON DUPLICATE KEY UPDATE REQUEST_TEXT = ?`;
      const values = [
        req.params.id,
        req.body.REQUEST_TEXT,
        req.body.REQUEST_TEXT,
      ];
      connection.query(query, values, async (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for doc change request text: " + err);
          res.sendStatus(500);
          connection.end();
          return;
        }

        // Get the DCR details including ASSIGNED_TO
        const dcrQuery = `SELECT ASSIGNED_TO, DOCUMENT_ID, REQUEST_DATE FROM DOCM_CHNG_RQST WHERE REQUEST_ID = ?`;
        connection.query(dcrQuery, [req.params.id], async (err, dcrRows) => {
          if (err) {
            console.log("Failed to query for DCR details: " + err);
            res.json(rows);
            connection.end();
            return;
          }

          if (dcrRows && dcrRows.length > 0) {
            const assignedTo = dcrRows[0].ASSIGNED_TO;
            const documentId = dcrRows[0].DOCUMENT_ID;

            // Get the assignee's email
            const emailQuery = `SELECT WORK_EMAIL_ADDRESS FROM PEOPLE WHERE PEOPLE_ID = ?`;
            connection.query(
              emailQuery,
              [assignedTo],
              async (err, emailRows) => {
                connection.end();

                if (err || !emailRows || emailRows.length === 0) {
                  console.log("Could not retrieve email for assigned person");
                  res.json(rows);
                  return;
                }

                const assigneeEmail = emailRows[0].WORK_EMAIL_ADDRESS;

                // Send email notification
                try {
                  const transporter = nodemailer.createTransport({
                    host: process.env.SMTP_HOST,
                    port: Number(process.env.SMTP_PORT),
                    secure: true,
                    auth: {
                      user: process.env.SMTP_USER,
                      pass: process.env.SMTP_PASS,
                    },
                  });

                  const mailOptions = {
                    to: assigneeEmail,
                    from: process.env.SMTP_FROM,
                    subject: `DCR Update: ${req.params.id} - ${documentId}`,
                    text: `A new comment has been added to Document Change Request ${req.params.id}.\n\nDocument: ${documentId}\n\nPlease log in to the QMS system to view the updated request.\n\nIf you have any questions, please contact the quality manager.`,
                    bcc: "<tim.kent@ci-aviation.com>",
                  };

                  await transporter.sendMail(mailOptions);
                  console.log("Email sent to " + assigneeEmail);
                } catch (emailError) {
                  console.log("Error sending email:", emailError);
                }

                res.json(rows);
              }
            );
          } else {
            connection.end();
            res.json(rows);
          }
        });
      });
    });
  } catch (err) {
    console.log("Error connecting to Db 93");
    return;
  }
});

// ==================================================
// Get all records
router.get("/", (req, res) => {
  try {
    const connection = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      port: 3306,
      database: "quality",
    });
    connection.connect(function (err) {
      if (err) {
        console.error("Error connecting: " + err.stack);
        return;
      }
      // console.log('Connected to DB');

      const query =
        "select DOCUMENT_ID, dcr.REQUEST_ID, dcrt.REQUEST_TEXT, CHANGE_REASON, REQUEST_DATE, ASSIGNED_TO, CLOSED, CLOSED_DATE from DOCM_CHNG_RQST dcr left join DOC_CHG_REQ_TXT dcrt on dcr.REQUEST_ID = dcrt.REQUEST_ID order by CLOSED, REQUEST_ID desc";
      // const query = 'select * from DOCM_CHNG_RQST';
      connection.query(query, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for DOCM_CHNG_RQST: " + err);
          res.sendStatus(500);
          return;
        }
        res.json(rows);
      });

      connection.end();
    });
  } catch (err) {
    console.log("Error connecting to Db 44");
    return;
  }
});

// ==================================================
// Create a record
router.post("/", (req, res) => {
  try {
    const connection = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      port: 3306,
      database: "quality",
    });
    connection.connect(function (err) {
      if (err) {
        console.error("Error connecting: " + err.stack);
        return;
      }
      console.log("Connected to DB");

      const date_due = new Date(req.body.DUE_DATE);
      // convert ASSIGNED_TO to uppercase
      req.body.ASSIGNED_TO = req.body.ASSIGNED_TO.toUpperCase();
      // convert DOCUMENT_ID to uppercase
      req.body.DOCUMENT_ID = req.body.DOCUMENT_ID.toUpperCase();
      // convert to MySQL date format
      date_due.setDate(date_due.getDate() + 30);
      console.log(date_due.toLocaleDateString());
      date_due.toLocaleDateString();

      const query = `INSERT INTO DOCM_CHNG_RQST (
        REQUEST_ID, REQUEST_DATE, ASSIGNED_TO, DUE_DATE, DOCUMENT_ID, 
        CHANGE_TYPE, CHANGE_REASON, PRIORITY, CREATE_BY, CREATE_DATE, CLOSED
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      const values = [
        req.body.REQUEST_ID,
        req.body.REQUEST_DATE,
        req.body.ASSIGNED_TO,
        req.body.DUE_DATE,
        req.body.DOCUMENT_ID,
        req.body.CHANGE_TYPE,
        req.body.CHANGE_REASON,
        req.body.PRIORITY,
        req.body.CREATE_BY,
        req.body.CREATE_DATE,
        "N",
      ];

      connection.query(query, values, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for doc change insert: " + err);
          res.sendStatus(500);
          return;
        }
        res.json(rows);
      });

      const updateQuery = `UPDATE SYSTEM_IDS SET CURRENT_ID = ? WHERE TABLE_NAME = 'DOCM_CHNG_RQST'`;
      const updateValues = [req.body.REQUEST_ID];
      connection.query(updateQuery, updateValues, (err, rows, fields) => {
        if (err) {
          console.log(
            "Failed to query for doc change system id update: " + err
          );
          res.sendStatus(500);
          return;
        }
      });

      const updateQuery2 = `INSERT INTO DOC_CHG_REQ_TXT (REQUEST_ID, REQUEST_TEXT) VALUES (?, ?)`;
      const updateValues2 = [req.body.REQUEST_ID, req.body.REQUEST_TEXT];
      connection.query(updateQuery2, updateValues2, (err, rows, fields) => {
        if (err) {
          console.log("Failed to update for doc change text: " + err);
          res.sendStatus(500);
          return;
        }
      });

      connection.end();
    });
  } catch (err) {
    console.log("Error connecting to Db (changes 106)");
    return;
  }
});

// Get the next ID for a new dcr record
router.get("/nextId", (req, res) => {
  // res.json('0000005');
  try {
    const connection = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      port: 3306,
      database: "quality",
    });
    connection.connect(function (err) {
      if (err) {
        console.error("Error connecting: " + err.stack);
        return;
      }
      // console.log('Connected to DB');

      const query =
        'SELECT CURRENT_ID FROM SYSTEM_IDS where TABLE_NAME = "DOCM_CHNG_RQST"';
      connection.query(query, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for corrective actions: " + err);
          res.sendStatus(500);
          return;
        }
        const nextId = parseInt(rows[0].CURRENT_ID) + 1;
        let dbNextId = nextId.toString().padStart(7, "0");

        res.json(dbNextId);
      });

      connection.end();
    });
  } catch (err) {
    console.log("Error connecting to Db 157");
    return;
  }
});

// ==================================================
// Get a single record
router.get("/:id", (req, res) => {
  try {
    const connection = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      port: 3306,
      database: "quality",
    });
    connection.connect(function (err) {
      if (err) {
        console.error("Error connecting: " + err.stack);
        return;
      }
      // console.log('Connected to DB');

      const query = `SELECT dcr.*, dcrt.REQUEST_TEXT, dcrr.RESPONSE_TEXT 
        FROM DOCM_CHNG_RQST dcr 
        LEFT JOIN DOC_CHG_REQ_TXT dcrt ON dcr.REQUEST_ID = dcrt.REQUEST_ID
        LEFT JOIN DOCM_CHNG_RSPN dcrr ON dcr.REQUEST_ID = dcrr.REQUEST_ID
        WHERE dcr.REQUEST_ID = ?`;

      const values = [req.params.id];

      connection.query(query, values, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for doc change request: " + err);
          res.sendStatus(500);
          return;
        }
        res.json(rows);
      });

      connection.end();
    });
  } catch (err) {
    console.log("Error connecting to Db 192");
    return;
  }
});

// ==================================================
// put closed status
router.put("/close/:id", async (req, res) => {
  // let modifiedDate = new Date().toISOString().slice(0, 19).replace("T", " ");
  try {
    const connection = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      port: 3306,
      database: "quality",
    });
    connection.connect(function (err) {
      if (err) {
        console.error("Error connecting: " + err.stack);
        return;
      }
      // sql to insert on duplicate key update
      const query = `UPDATE DOCM_CHNG_RQST SET 
      CLOSED = ?, CLOSED_DATE = ?, DECISION = ?, DECISION_DATE = ?, MODIFIED_BY = ?, MODIFIED_DATE = ?
      WHERE REQUEST_ID = ?`;
      const values = [
        req.body.CLOSED,
        req.body.CLOSED_DATE,
        req.body.DECISION,
        req.body.DECISION_DATE,
        req.body.MODIFIED_BY,
        req.body.MODIFIED_DATE,
        req.params.id,
      ];
      connection.query(query, values, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for doc change closed status: " + err);
          res.sendStatus(500);
          connection.end();
          return;
        }
        // res.json(rows);
      });
      //   update document revision and date
      const query2 = `UPDATE DOCUMENTS SET REVISION_LEVEL = ?, ISSUE_DATE = ? WHERE DOCUMENT_ID = ?`;
      const values2 = [
        req.body.REVISION_LEVEL,
        req.body.REVISION_DATE,
        req.body.DOCUMENT_ID,
      ];
      connection.query(query2, values2, async (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for doc change revision level: " + err);
          res.sendStatus(500);
          connection.end();
          return;
        }

        // Send email if decision is Approved (A)
        if (req.body.DECISION === "A") {
          try {
            const transporter = nodemailer.createTransport({
              host: process.env.SMTP_HOST,
              port: Number(process.env.SMTP_PORT),
              secure: true,
              auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
              },
            });

            // Compose recipients with fallbacks so 'To' is never blank in the sent message
            const toRcpts = [process.env.EMAIL_GM].filter(Boolean);
            const ccRcpts = [process.env.EMAIL_QM].filter(Boolean);
            const toHeader = toRcpts.length
              ? toRcpts.join(", ")
              : process.env.SMTP_FROM || "";
            const ccHeader = ccRcpts.length ? ccRcpts.join(", ") : undefined;

            const mailOptions = {
              to: toHeader,
              cc: ccHeader,
              from: process.env.SMTP_FROM,
              subject: `DCR Approved: ${req.params.id} - ${req.body.DOCUMENT_ID}`,
              text: `Document Change Request ${req.params.id} has been approved.\n\nDocument: ${req.body.DOCUMENT_ID}\nNew Revision: ${req.body.REVISION_LEVEL}\nRevision Date: ${req.body.REVISION_DATE}\nApproved By: ${req.body.MODIFIED_BY}\n\nPlease log in to the QMS system to view the details.`,
              bcc: "<tim.kent@ci-aviation.com>",
            };

            await transporter.sendMail(mailOptions);
            console.log("Approval email sent to GM and QM");
          } catch (emailError) {
            console.log("Error sending approval email:", emailError);
          }
        }

        connection.end();
        res.sendStatus(200);
      });
    });
  } catch (err) {
    console.log("Error connecting to Db 328");
    return;
  }
});

module.exports = router;
