const express = require("express");
const router = express.Router();
const mysql = require("mysql2");
const nodemailer = require("nodemailer");

// ==================================================
// Send email using nodemailer
// ==================================================
// Send email using nodemailer
router.post("/email/:id", async (req, res) => {
  console.log("Email endpoint (/email/:id) called with:", {
    id: req.params.id,
  });
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: true, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      debug: true,
      logger: true,
      tls: {
        rejectUnauthorized: false, // Allow self-signed certificates
      },
    });

    console.log("Verifying SMTP connection for /email/:id");
    await transporter.verify();

    const { iid, to, from, subject, text } = req.body.data;
    let blindCopy = "<tim.kent@ci-aviation.com>";
    const mailOptions = {
      from,
      to,
      subject,
      text,
      bcc: blindCopy,
    };

    console.log("Sending email with options:", mailOptions);
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info.response);
    res.status(200).json({
      success: true,
      message: "Email sent successfully",
      info: info.response,
    });
  } catch (error) {
    console.error("Error sending email (/email/:id):", error.message);
    console.error("Full error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.toString(),
    });
  }
});

// ==================================================
// Get CTA Issues Report Data
// ==================================================
router.get("/ctaissues", (req, res) => {
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
        console.error("Error connecting to database: " + err.stack);
        res.sendStatus(500);
        return;
      }

      const query = `SELECT 
        pi.INPUT_ID,
        pi.INPUT_DATE,
        pi.SUBJECT,
        pi.ASSIGNED_TO,
        pi.DUE_DATE,
        pi.CLOSED,
        pi.CLOSED_DATE,
        rq.INPUT_TEXT AS REQUEST_TEXT,
        re.RESPONSE_TEXT
      FROM PEOPLE_INPUT pi
      LEFT JOIN PPL_INPT_TEXT rq ON pi.INPUT_ID = rq.INPUT_ID
      LEFT JOIN PPL_INPT_RSPN re ON pi.INPUT_ID = re.INPUT_ID
      WHERE pi.SUBJECT LIKE '%CTA%'
        AND (YEAR(pi.CLOSED_DATE) = 2025 OR pi.CLOSED_DATE IS NULL)
      ORDER BY pi.CLOSED_DATE, pi.SUBJECT`;

      connection.query(query, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for CTA issues: " + err);
          res.sendStatus(500);
          return;
        }
        res.json(rows);
      });

      connection.end();
    });
  } catch (error) {
    console.error("Error in CTA report endpoint:", error);
    res.sendStatus(500);
  }
});

// ==================================================
// Get SYSDOC Issues Report Data
// ==================================================
router.get("/sysdocissues", (req, res) => {
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
        console.error("Error connecting to database: " + err.stack);
        res.sendStatus(500);
        return;
      }

      const query = `SELECT 
        pi.INPUT_ID,
        pi.INPUT_DATE,
        pi.SUBJECT,
        pi.ASSIGNED_TO,
        pi.DUE_DATE,
        pi.CLOSED,
        pi.CLOSED_DATE,
        rq.INPUT_TEXT AS REQUEST_TEXT,
        re.RESPONSE_TEXT
      FROM PEOPLE_INPUT pi
      LEFT JOIN PPL_INPT_TEXT rq ON pi.INPUT_ID = rq.INPUT_ID
      LEFT JOIN PPL_INPT_RSPN re ON pi.INPUT_ID = re.INPUT_ID
      WHERE pi.SUBJECT LIKE '%DOC%'
        AND pi.SUBJECT NOT LIKE '%MM'
        AND (pi.CLOSED_DATE >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 YEAR), '%Y-01-01') OR pi.CLOSED_DATE IS NULL)
      ORDER BY pi.CLOSED_DATE DESC, pi.INPUT_DATE DESC`;

      connection.query(query, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for SYSDOC issues: " + err);
          res.sendStatus(500);
          return;
        }
        res.json(rows);
      });

      connection.end();
    });
  } catch (error) {
    console.error("Error in SYSDOC report endpoint:", error);
    res.sendStatus(500);
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

      const query = `select pi.INPUT_ID
        , pi.INPUT_DATE
        , pi.SUBJECT
        , pi.ASSIGNED_TO
        , pi.PROJECT_ID
        , pit.INPUT_TEXT
        , pi.DUE_DATE
        , pi.CLOSED
        , pi.CLOSED_DATE 
        from PEOPLE_INPUT pi left join PPL_INPT_TEXT pit on pi.INPUT_ID = pit.INPUT_ID order by pi.INPUT_ID desc`;
      // where USER_DEFINED_1 = 'MR'

      connection.query(query, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for inputs: " + err);
          res.sendStatus(500);
          return;
        }
        res.json(rows);
      });

      connection.end();
    });
  } catch (err) {
    console.log("Error connecting to Db");
    return;
  }
});

// ==================================================
// Get closed records
router.get("/closed", (req, res) => {
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

      const query = `select pi.INPUT_ID
        , pi.INPUT_DATE
        , pi.SUBJECT
        , pi.ASSIGNED_TO
        , pi.PROJECT_ID
        , pit.INPUT_TEXT
        , pi.DUE_DATE
        , pi.CLOSED
        , pi.CLOSED_DATE 
        from PEOPLE_INPUT pi left join PPL_INPT_TEXT pit on pi.INPUT_ID = pit.INPUT_ID where CLOSED = 'Y' order by pi.CLOSED_DATE desc`;
      // where USER_DEFINED_1 = 'MR'

      connection.query(query, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for inputs: " + err);
          res.sendStatus(500);
          return;
        }
        res.json(rows);
      });

      connection.end();
    });
  } catch (err) {
    console.log("Error connecting to Db");
    return;
  }
});

// ==================================================
// Get records where SUBJECT='RISK' or INPUT_TYPE='RISK'
router.get("/risks", (req, res) => {
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

      const query = `select pi.INPUT_ID
        , pi.INPUT_DATE
        , pi.SUBJECT
        , pi.ASSIGNED_TO
        , pi.PROJECT_ID
        , pit.INPUT_TEXT
        , pi.DUE_DATE
        , pi.CLOSED
        , pi.CLOSED_DATE 
        from PEOPLE_INPUT pi left join PPL_INPT_TEXT pit on pi.INPUT_ID = pit.INPUT_ID 
        where pi.SUBJECT = 'RISK' or pi.INPUT_TYPE = 'RISK' 
        order by pi.INPUT_ID desc`;

      connection.query(query, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for risk inputs: " + err);
          res.sendStatus(500);
          return;
        }
        res.json(rows);
      });

      connection.end();
    });
  } catch (err) {
    console.log("Error connecting to Db");
    return;
  }
});

// Get the next ID for a new record
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
        'SELECT CURRENT_ID FROM SYSTEM_IDS where TABLE_NAME = "PEOPLE_INPUT"';
      connection.query(query, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for people input: " + err);
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
    console.log("Error connecting to Db 93");
    return;
  }
});

// ==================================================
// Send email using nodemailer
router.post("/email", async (req, res) => {
  console.log("Email route called with:", {
    to: req.body.ASSIGNED_TO_EMAIL,
    subject: req.body.SUBJECT,
    inputId: req.body.INPUT_ID,
  });

  try {
    // SMTP debug flag - set to true to enable detailed SMTP logging
    const SMTP_DEBUG = true;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      debug: SMTP_DEBUG,
      logger: true, // Enable logger
      tls: {
        rejectUnauthorized: false, // Allow self-signed certificates
      },
    });

    // Verify connection configuration
    console.log("Verifying SMTP connection...");
    await transporter.verify();
    console.log("SMTP connection verified successfully");

    const mailOptions = {
      to: req.body.ASSIGNED_TO_EMAIL,
      from: process.env.SMTP_FROM,
      cc: process.env.EMAIL_QM || "tim.kent@ci-aviation.com",
      subject: `Action Item Notification: ${req.body.INPUT_ID} - ${req.body.SUBJECT}`,
      text: `The following action item has been assigned.\nInput Id: ${req.body.INPUT_ID} \nDue Date: ${req.body.DUE_DATE} \nAssigned To: ${req.body.ASSIGNED_TO} \nDescription:\n${req.body.INPUT_TEXT}\n\nPlease log in to the QMS system to view the details and take timely action.\n\nIf you have any questions, please contact the quality manager.`,
    };

    console.log("Sending mail with options:", mailOptions);
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info.response);
    res.status(200).json({
      success: true,
      message: "Email sent successfully",
      info: info.response,
    });
  } catch (error) {
    console.error("Error sending email:", error.message);
    console.error("Full error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.toString(),
    });
  }
});

// ==================================================
// Log INPUT notification to centralized EMAIL_HISTORY table
router.post("/inputs_notify", (req, res) => {
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
        console.error(
          "Error connecting to log input notification: " + err.stack,
        );
        return;
      }
      // Support both direct and nested (data) payloads
      const data = req.body.data ? req.body.data : req.body;
      const { INPUT_ID, ASSIGNED_TO, RECIPIENT_EMAIL, SUBJECT, BODY, ACTION } =
        data;

      // Map ACTION to EMAIL_TYPE
      const emailTypeMap = { A: "ASSIGNMENT", C: "CLOSEOUT", R: "REQUEST" };
      const emailType = emailTypeMap[ACTION] || ACTION;

      const emailNotes =
        SUBJECT && BODY
          ? `Subject: ${SUBJECT}\n\nBody: ${BODY}`
          : `Input notification - Action: ${ACTION}`;

      const query = `INSERT INTO EMAIL_HISTORY (APP_MODULE, APP_ID, ASSIGNED_TO, RECIPIENT_EMAIL, SENT_DATE, EMAIL_STATUS, EMAIL_TYPE, NOTES) VALUES (?, ?, ?, ?, NOW(), ?, ?, ?)`;
      const values = [
        "INPUT",
        INPUT_ID,
        ASSIGNED_TO,
        RECIPIENT_EMAIL || null,
        "SENT",
        emailType,
        emailNotes,
      ];

      connection.query(query, values, (err) => {
        if (err) {
          console.log(
            "Failed to log INPUT notification to EMAIL_HISTORY: " + err,
          );
          res.sendStatus(500);
          return;
        }
        res.sendStatus(200);
      });
      connection.end();
    });
  } catch (err) {
    console.log("Error logging INPUT notification: " + err.message);
    res.sendStatus(500);
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
      const query = `INSERT INTO PEOPLE_INPUT (
                INPUT_ID, INPUT_DATE, PEOPLE_ID, ASSIGNED_TO, DUE_DATE, INPUT_TYPE, SUBJECT, PROJECT_ID, CLOSED, CREATE_DATE, CREATE_BY, USER_DEFINED_2
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      const values = [
        req.body.INPUT_ID,
        req.body.INPUT_DATE,
        req.body.PEOPLE_ID,
        req.body.ASSIGNED_TO,
        req.body.DUE_DATE,
        req.body.INPUT_TYPE,
        req.body.SUBJECT,
        req.body.PROJECT_ID,
        req.body.CLOSED,
        req.body.CREATE_DATE,
        req.body.CREATE_BY,
        req.body.USER_DEFINED_2 || null,
      ];

      connection.query(query, values, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for PEOPLE_INPUT insert: " + err);
          res.sendStatus(500);
          return;
        }
        res.json(rows);
      });

      const insertQuery =
        "INSERT INTO PPL_INPT_TEXT (INPUT_ID, INPUT_TEXT) VALUES (?, ?)";
      connection.query(
        insertQuery,
        [req.body.INPUT_ID, req.body.INPUT_TEXT],
        (err, rows, fields) => {
          if (err) {
            console.log("Failed to query for PPL_INPT_TEXT insert: " + err);
            res.sendStatus(500);
            return;
          }
        },
      );

      const updateQuery = `UPDATE SYSTEM_IDS SET CURRENT_ID = ? WHERE TABLE_NAME = 'PEOPLE_INPUT'`;
      connection.query(
        updateQuery,
        [req.body.INPUT_ID],
        (err, rows, fields) => {
          if (err) {
            console.log("Failed to query for system id update: " + err);
            res.sendStatus(500);
            return;
          }
        },
      );

      connection.end();
    });
  } catch (err) {
    console.log("Error connecting to Db (changes 282)");
    return;
  }
});

// ==================================================
// increment the ID
router.put("/incrementId", (req, res) => {
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

      const query = `UPDATE SYSTEM_IDS SET CURRENT_ID = LPAD(CAST(CAST(CURRENT_ID AS UNSIGNED) + 1 AS CHAR), 7, '0') WHERE TABLE_NAME = 'PEOPLE_INPUT'`;
      connection.query(query, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for system id update: " + err);
          res.sendStatus(500);
          return;
        }
        res.json(rows);
      });

      connection.end();
    });
  } catch (err) {
    console.log("Error connecting to Db 318");
    return;
  }
});

// ==================================================
// Get open repairs - filtered for project 8511, type REP, not closed, excluding recurring
router.get("/openrepairs", (req, res) => {
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

      const query = `select pi.INPUT_ID
        , pi.INPUT_DATE
        , pi.SUBJECT
        , pi.ASSIGNED_TO
        , pi.PROJECT_ID
        , pit.INPUT_TEXT
        , pi.DUE_DATE
        , pi.CLOSED
        , pi.CLOSED_DATE 
        , pi.INPUT_TYPE
        from PEOPLE_INPUT pi 
        left join PPL_INPT_TEXT pit on pi.INPUT_ID = pit.INPUT_ID 
        left join PPL_INPT_RCUR pirc on pi.USER_DEFINED_2 = pirc.RECUR_ID
        where pi.PROJECT_ID = '8511' 
        and pi.INPUT_TYPE = 'REP' 
        and pi.CLOSED = 'N'
        and pirc.RECUR_ID is null
        order by pi.INPUT_DATE asc`;

      connection.query(query, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for open repairs: " + err);
          res.sendStatus(500);
          return;
        }
        res.json(rows);
      });

      connection.end();
    });
  } catch (err) {
    console.log("Error connecting to Db (open repairs)");
    return;
  }
});

// ==================================================
// Get PM program issues - filtered for project 8511, excluding REP type, recurring, and specific subjects
router.get("/pmprogramissues", (req, res) => {
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
        res.sendStatus(500);
        return;
      }

      const query = `select pi.INPUT_ID
        , pi.INPUT_DATE
        , pi.SUBJECT
        , pi.ASSIGNED_TO
        , pi.PROJECT_ID
        , pit.INPUT_TEXT
        , pi.DUE_DATE
        , pi.CLOSED
        , pi.CLOSED_DATE 
        , pi.INPUT_TYPE
        from PEOPLE_INPUT pi 
        left join PPL_INPT_TEXT pit on pi.INPUT_ID = pit.INPUT_ID 
        left join PPL_INPT_RCUR pir on pi.SUBJECT = pir.SUBJECT
        where pi.PROJECT_ID like '8511%' 
        and pi.CLOSED = 'N'
        and pi.SUBJECT not in ('5S', '6S', '99X')
        and pi.INPUT_TYPE <> 'REP'
        and pir.SUBJECT is null
        order by pi.INPUT_DATE asc`;

      connection.query(query, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for PM program issues: " + err);
          res.sendStatus(500);
          return;
        }
        res.json(rows);
      });

      connection.end();
    });
  } catch (err) {
    console.log("Error connecting to Db (PM program issues)");
    res.sendStatus(500);
    return;
  }
});

// ==================================================
// PM Management Review: Custom date range for Expired and No Entries
// ==================================================
router.get("/pm-mgmt-review", (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res
      .status(400)
      .json({ error: "startDate and endDate query parameters required" });
  }

  const connection = mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASS || "",
    port: 3306,
    database: "quality",
  });

  connection.connect((err) => {
    if (err) {
      console.error("❌ DB connection failed:", err.stack);
      return res.status(500).json({ error: "Database connection failed" });
    }

    try {
      // Generate monthly breakdowns between start and end dates
      const months = [];
      const start = new Date(startDate);
      const end = new Date(endDate);

      // Start from the first day of start month
      const current = new Date(start.getFullYear(), start.getMonth(), 1);

      while (current <= end) {
        const monthStart = new Date(
          current.getFullYear(),
          current.getMonth(),
          1,
        );
        const monthEnd = new Date(
          current.getFullYear(),
          current.getMonth() + 1,
          0,
        );

        // Don't include months beyond the end date
        if (monthStart > end) break;

        const monthName = monthStart.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        });
        const monthStartStr = monthStart.toISOString().split("T")[0];
        const monthEndStr = monthEnd.toISOString().split("T")[0];

        months.push({
          monthName,
          monthStart: monthStartStr,
          monthEnd: monthEndStr,
        });

        current.setMonth(current.getMonth() + 1);
      }

      // Build UNION query for each month
      const queries = months
        .map(
          (m) =>
            `SELECT '${m.monthName}' as month_name, 
                    SUM(CASE WHEN re.RESPONSE_TEXT REGEXP 'expired' THEN 1 ELSE 0 END) as expired_count,
                    SUM(CASE WHEN re.RESPONSE_TEXT REGEXP 'no ent' THEN 1 ELSE 0 END) as no_entries_count
             FROM PEOPLE_INPUT pi 
             LEFT JOIN PPL_INPT_RCUR pir ON pi.SUBJECT = pir.SUBJECT
             LEFT JOIN PPL_INPT_RSPN re ON pi.INPUT_ID = re.INPUT_ID
             WHERE pir.STATUS = 'A' 
             AND pir.SUBJECT REGEXP 'PM[0-9]{2}'
             AND pi.INPUT_DATE BETWEEN '${m.monthStart}' AND '${m.monthEnd}'`,
        )
        .join(" UNION ALL ");

      if (!queries || queries.length === 0) {
        console.error("❌ No queries generated for date range");
        return res.json({ labels: [], expired: [], no_entries: [] });
      }

      console.log("📊 Executing PM review query for", months.length, "months");

      connection.query(queries, (err, rows) => {
        if (err) {
          console.error("❌ Query failed:", err);
          res.status(500).json({ error: "Query execution failed" });
        } else {
          console.log("📊 Query returned", rows ? rows.length : 0, "rows");
          const labels = rows.map((row) => row.month_name);
          const expired = rows.map((row) => row.expired_count || 0);
          const no_entries = rows.map((row) => row.no_entries_count || 0);
          console.log("📊 Returning data:", {
            labelsCount: labels.length,
            expiredCount: expired.length,
            no_entriesCount: no_entries.length,
          });
          res.json({ labels, expired, no_entries });
        }
        connection.end();
      });
    } catch (error) {
      console.error("❌ Error in PM mgmt review endpoint:", error);
      res.status(500).json({ error: "Server error" });
      connection.end();
    }
  });
});

// ==================================================
// Get a single record
router.get("/:id", (req, res) => {
  // console.log(req.params.id);
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

      const query = `SELECT 
        pi.INPUT_ID
        , pi.PEOPLE_ID
        , pi.PROJECT_ID
        , INPUT_DATE
        , pi.DUE_DATE
        , pi.ASSIGNED_TO
        , INPUT_TYPE
        , pi.SUBJECT
        , pi.CLOSED
        , pi.CLOSED_DATE
        , pit.INPUT_TEXT
        , pi.RESPONSE_DATE
        , pi.RESPONSE_BY
        , pi.FOLLOWUP_DATE
        , pi.FOLLOWUP_BY
        , pir.RESPONSE_TEXT
        , pif.FOLLOWUP_TEXT 
        , p.NAME
        , pirc.RECUR_ID
        FROM quality.PEOPLE_INPUT pi left join PPL_INPT_TEXT pit on pi.INPUT_ID = pit.INPUT_ID
        left join PPL_INPT_FLUP pif on pi.INPUT_ID = pif.INPUT_ID
        left join PPL_INPT_RSPN pir on pi.INPUT_ID = pir.INPUT_ID 
        left join PROJECT p on pi.PROJECT_ID = p.PROJECT_ID
        left join PPL_INPT_RCUR pirc on pi.USER_DEFINED_2 = pirc.RECUR_ID
        where pi.INPUT_ID = ?`;

      // console.log(query);

      connection.query(query, [req.params.id], (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for corrective actions: " + err);
          res.sendStatus(500);
          return;
        }
        res.json(rows);
      });

      connection.end();
    });
  } catch (err) {
    console.log("Error connecting to Db 83");
    return;
  }
});

// RESPONSES<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
router.put("/:id", (req, res) => {
  // console.log("Params: " + req.params.id);
  // console.log(req.body);
  // console.log(req.body['data']);
  let mydata = req.body["data"];
  let mytable = "";
  let appended = "";
  // const myfield = Object.keys (req.body) [2]
  const myfield = Object.keys(mydata)[2];
  // console.log("257: " + myfield);
  // log the name of the third key
  switch (myfield) {
    case "RESPONSE_TEXT":
      // console.log('Response');
      mytable = "PPL_INPT_RSPN";
      // appended = req.body.RESPONSE_TEXT.replace(/'/g, "\\'");
      // appended = req.body.RESPONSE_TEXT;
      appended = mydata.RESPONSE_TEXT;
      break;
    case "FOLLOWUP_TEXT":
      // console.log('Followup');
      mytable = "PPL_INPT_FLUP";
      // appended = req.body.FOLLOWUP_TEXT.replace(/'/g, "/''");
      // appended = req.body.FOLLOWUP_TEXT
      appended = mydata.FOLLOWUP_TEXT;
      break;
    case "INPUT_TEXT":
      // console.log('Input');
      mytable = "PPL_INPT_TEXT";
      // appended = req.body.INPUT_TEXT
      appended = mydata.INPUT_TEXT;
      break;
    default:
      console.log("No match");
  }
  // Replace the br with a newline
  appended = appended.replace(/<br>/g, "\n");
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
      // console.log(req.body);
      const query = `REPLACE INTO ${mytable} SET 
            INPUT_ID = ?,
            ?? = ?`;

      const values = [req.params.id, myfield, appended];
      // console.log(query);

      connection.query(query, values, (err, rows, fields) => {
        if (err) {
          // console.log("Failed to query for input : " + err);
          res.sendStatus(500);
          connection.end();
          return;
        }
        const response = { data: rows };
        if (req.capsWarning) {
          response.warning =
            "⚠️ All caps is considered YELLING in professional communication. Please use normal capitalization.";
        }
        res.json(response);

        if (myfield === "RESPONSE_TEXT") {
          const updateQuery = `
              UPDATE PEOPLE_INPUT 
              SET RESPONSE_DATE = ?, 
                  RESPONSE_BY = ?,
                  MODIFIED_BY = ?, 
                  MODIFIED_DATE = ? 
              WHERE INPUT_ID = ?`;
          const updateValues = [
            mydata.RESPONSE_DATE,
            mydata.RESPONSE_BY,
            mydata.MODIFIED_BY,
            mydata.MODIFIED_DATE,
            req.params.id,
          ];
          connection.query(updateQuery, updateValues, (err) => {
            if (err) {
              // console.log("Failed to query for response date update: " + err);
              res.sendStatus(500);
            }
            connection.end();
          });
        } else if (myfield === "FOLLOWUP_TEXT") {
          const updateQuery = `
              UPDATE PEOPLE_INPUT 
              SET FOLLOWUP_DATE = ?, 
                  FOLLOWUP_BY = ?,
                  MODIFIED_BY = ?, 
                  MODIFIED_DATE = ? 
              WHERE INPUT_ID = ?`;
          const updateValues = [
            mydata.FOLLOWUP_DATE,
            mydata.FOLLOWUP_BY,
            mydata.MODIFIED_BY,
            mydata.MODIFIED_DATE,
            req.params.id,
          ];
          connection.query(updateQuery, updateValues, (err) => {
            if (err) {
              // console.log("Failed to query for followup date update: " + err);
              res.sendStatus(500);
            }
            connection.end();
          });
        } else {
          connection.end();
        }
      });
    });
  } catch (err) {
    // console.log("Error connecting to Db 312");
    return;
  }
});

// CLOSE THE INPUT<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
router.put("/close/:id", (req, res) => {
  // console.log("Params: " + req.params.id);
  // console.log(req.body);
  let mytable = "";
  let appended = "";
  const myfield = Object.keys(req.body)[1];

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
      const query = `UPDATE PEOPLE_INPUT SET CLOSED = 'Y', CLOSED_DATE = '${req.body.CLOSED_DATE}' WHERE INPUT_ID = '${req.params.id}'`;
      // console.log(query);

      connection.query(query, (err, rows, fields) => {
        if (err) {
          // console.log("Failed to query for input : " + err);
          res.sendStatus(500);
          return;
        }
        res.json(rows);
      });

      connection.end();
    });
  } catch (err) {
    // console.log("Error connecting to Db 345");
    return;
  }
});

// ==================================================
// Get previous records
router.get("/previous/:id", (req, res) => {
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

      const query = `with subjects as (select * from PEOPLE_INPUT where SUBJECT = (select SUBJECT from PEOPLE_INPUT where INPUT_ID = '${req.params.id}')) select * from PPL_INPT_RSPN pir join subjects on pir.INPUT_ID = subjects.INPUT_ID order by pir.INPUT_ID desc limit 5`;

      connection.query(query, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for corrective actions: " + err);
          res.sendStatus(500);
          return;
        }
        res.json(rows);
      });

      connection.end();
    });
  } catch (err) {
    console.log("Error connecting to Db 393");
    return;
  }
});

router.put("/detail/:id", (req, res) => {
  // put the detail
  let mydata = req.body["data"];
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
      const query = `UPDATE PEOPLE_INPUT SET 
        ASSIGNED_TO = '${mydata.ASSIGNED_TO}',
        DUE_DATE = '${mydata.DUE_DATE}',
        SUBJECT = '${mydata.SUBJECT}',
        INPUT_TYPE = '${mydata.INPUT_TYPE}',
        PROJECT_ID = '${mydata.PROJECT_ID}',
        PEOPLE_ID = '${mydata.REQUESTED_BY}',
        MODIFIED_DATE = '${mydata.MODIFIED_DATE}',
        MODIFIED_BY = '${mydata.MODIFIED_BY}'
        WHERE INPUT_ID = '${req.params.id}'`;
      // console.log(query);
      connection.query(query, (err, rows, fields) => {
        if (err) {
          // console.log("Failed to query for input : " + err);
          res.sendStatus(500);
          return;
        }
        const response = { data: rows };
        if (req.capsWarning) {
          response.warning =
            "⚠️ All caps is considered YELLING in professional communication. Please use normal capitalization.";
        }
        res.json(response);
      });

      connection.end();
    });
  } catch (err) {
    // console.log("Error connecting to Db INPUT 444");
    return;
  }
});

// ==================================================
// POST measurement data collection (01TE, 08TE, QTPC, QTPH)
// Handles Percent, Fahrenheit, pH, and Seconds values
// ==================================================
router.post("/collect/:iid", (req, res) => {
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

      let key = Object.keys(req.body)[0];
      const iid = req.params.iid;
      const percent = req.body[key].PERCENT;
      const fahrenheit = req.body[key].FAHRENHEIT;
      const ph = req.body[key].PH;
      const seconds = req.body[key].SECONDS;

      let insertCount = 0;
      let errorOccurred = false;

      // Only insert PERCENT entry if provided
      if (percent) {
        const percentQuery = `INSERT INTO EIGHTYFIVETWELVE (INPUT_ID, UNIT, VALUE) 
          VALUES ('${iid}', 'Percent', '${percent}')`;

        connection.query(percentQuery, (err, rows, fields) => {
          if (err) {
            console.log(
              "Failed to insert Percent into EIGHTYFIVETWELVE: " + err,
            );
            errorOccurred = true;
          }
          insertCount++;
          checkCompletion();
        });
      } else {
        insertCount++;
      }

      // Only insert FAHRENHEIT entry if provided
      if (fahrenheit) {
        const fahrenheitQuery = `INSERT INTO EIGHTYFIVETWELVE (INPUT_ID, UNIT, VALUE) 
          VALUES ('${iid}', 'F', '${fahrenheit}')`;

        connection.query(fahrenheitQuery, (err, rows, fields) => {
          if (err) {
            console.log(
              "Failed to insert Fahrenheit into EIGHTYFIVETWELVE: " + err,
            );
            errorOccurred = true;
          }
          insertCount++;
          checkCompletion();
        });
      } else {
        insertCount++;
      }

      // Only insert PH entry if provided
      if (ph) {
        const phQuery = `INSERT INTO EIGHTYFIVETWELVE (INPUT_ID, UNIT, VALUE) 
          VALUES ('${iid}', 'pH', '${ph}')`;

        connection.query(phQuery, (err, rows, fields) => {
          if (err) {
            console.log("Failed to insert pH into EIGHTYFIVETWELVE: " + err);
            errorOccurred = true;
          }
          insertCount++;
          checkCompletion();
        });
      } else {
        insertCount++;
      }

      // Only insert SECONDS entry if provided
      if (seconds) {
        const secondsQuery = `INSERT INTO EIGHTYFIVETWELVE (INPUT_ID, UNIT, VALUE) 
          VALUES ('${iid}', 'Seconds', '${seconds}')`;

        connection.query(secondsQuery, (err, rows, fields) => {
          if (err) {
            console.log(
              "Failed to insert Seconds into EIGHTYFIVETWELVE: " + err,
            );
            errorOccurred = true;
          }
          insertCount++;
          checkCompletion();
        });
      } else {
        insertCount++;
      }

      function checkCompletion() {
        if (insertCount === 4) {
          try {
            if (connection && connection.end) connection.end();
          } catch {}
          if (errorOccurred) {
            res.sendStatus(500);
          } else {
            res.json({ success: true });
          }
        }
      }
    });
  } catch (err) {
    console.log("Error connecting to Db (input collect)");
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
