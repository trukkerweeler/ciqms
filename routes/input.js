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
      const { INPUT_ID, ASSIGNED_TO, ACTION } = data;

      // Map ACTION to EMAIL_TYPE
      const emailTypeMap = { A: "ASSIGNMENT", C: "CLOSEOUT", R: "REQUEST" };
      const emailType = emailTypeMap[ACTION] || ACTION;

      const query = `INSERT INTO EMAIL_HISTORY (APP_MODULE, APP_ID, ASSIGNED_TO, RECIPIENT_EMAIL, SENT_DATE, EMAIL_STATUS, EMAIL_TYPE, NOTES) VALUES (?, ?, ?, NULL, NOW(), ?, ?, ?)`;
      const values = [
        "INPUT",
        INPUT_ID,
        ASSIGNED_TO,
        "SENT",
        emailType,
        `Input notification - Action: ${ACTION}`,
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
                INPUT_ID, INPUT_DATE, PEOPLE_ID, ASSIGNED_TO, DUE_DATE, INPUT_TYPE, SUBJECT, PROJECT_ID, CLOSED, CREATE_DATE, CREATE_BY
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

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

module.exports = router;
