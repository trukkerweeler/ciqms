const express = require("express");
const router = express.Router();
const mysql = require("mysql");
const nodemailer = require("nodemailer");

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

      const query = `select * from EXPIRATION order by EXPIRY_DATE desc`;

      connection.query(query, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for expiry: " + err);
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
// Get the next ID for a new record
router.get("/nextId", (req, res) => {
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
        'SELECT CURRENT_ID FROM SYSTEM_IDS where TABLE_NAME = "EXPIRATION"';
      connection.query(query, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for expiration: " + err);
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
    console.log("Error connecting to Db 78");
    return;
  }
});

// ==================================================
// Send email using nodemailer
router.post("/email", async (req, res) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: true, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: process.env.SMTP_FROM,
      to: req.body.ASSIGNED_TO_EMAIL,
      subject: `Action Item Notification: ${req.body.INPUT_ID} - ${req.body.SUBJECT}`,
      text: `The following action item has been assigned.\nInput Id: ${req.body.INPUT_ID} \nDue Date: ${req.body.DUE_DATE} \nAssigned To: ${req.body.ASSIGNED_TO} \nDescription:\n${req.body.INPUT_TEXT}\n\nPlease log in to the QMS system to view the details and take timely action.\n\nIf you have any questions, please contact the quality manager.`,
    };

    const info = await transporter.sendMail(mailOptions);
    // console.log("Email sent:", info.response);
    res.status(200).send("Email sent successfully");
  } catch (error) {
    console.log("Error sending email:", error);
    res.status(500).send(error.toString());
  }
});

// ==================================================
// update INPUTS_NOTIFY table
router.post("/inputs_notify", (req, res) => {
  // console.log(req.body);
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
      const query = `INSERT INTO INPUTS_NOTIFY (INPUT_ID, NOTIFIED_DATE, ASSIGNED_TO, ACTION) VALUES (?, NOW(), ?, ?)`;
      const values = [req.body.INPUT_ID, req.body.ASSIGNED_TO, req.body.ACTION];
      // console.log(query);
      // console.log(values);
      connection.query(query, values, (err) => {
        if (err) {
          console.log("Failed to query for inputs notify: " + err);
          res.sendStatus(500);
          return;
        }
        res.sendStatus(200);
      });
      connection.end();
    });
  } catch (err) {
    console.log("Error connecting to Db 214");
    return;
  }
});

// ==================================================
// Create a record in EXPIRATION table
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
        res.sendStatus(500);
        return;
      }
      const query = `INSERT INTO EXPIRATION (
        EXPIRATION_ID, PO, PRODUCT_ID, DESCRIPTION, MFG_DATE, RECV_DATE, EXPIRY_DATE, LOT, DISPOSITION, COMMENT, CREATE_BY, CREATE_DATE
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      const values = [
        req.body.EXPIRATION_ID,
        req.body.PO,
        req.body.PRODUCT_ID,
        req.body.DESCRIPTION,
        req.body.MFG_DATE,
        req.body.RECV_DATE,
        req.body.EXPIRY_DATE,
        req.body.LOT,
        req.body.DISPOSITION,
        req.body.COMMENT,
        req.body.CREATE_BY,
        req.body.CREATE_DATE,
      ];
      console.log(query);
      console.log(values);

      connection.query(query, values, (err, rows, fields) => {
        if (err) {
          console.log("Failed to insert into EXPIRATION: " + err);
          res.sendStatus(500);
          return;
        }
        res.json({ success: true, id: rows.insertId });
      });

      connection.end();
    });
  } catch (err) {
    console.log("Error connecting to Db (EXPIRATION insert)");
    res.sendStatus(500);
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

      const query = `UPDATE SYSTEM_IDS SET CURRENT_ID = LPAD(CAST(CAST(CURRENT_ID AS UNSIGNED) + 1 AS CHAR), 7, '0') WHERE TABLE_NAME = 'EXPIRATION'`;
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
    console.log("Error connecting to Db 285");
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

      const query = `select * from EXPIRATION where EXPIRATION_ID = ?`;
      const values = [req.params.id];

      // console.log(query);

      connection.query(query, values, (err, rows, fields) => {
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
    console.log("Error connecting to Db 283");
    return;
  }
});

// RESPONSES<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
router.put("/:id", (req, res) => {
  // console.log(req.params.id);
  // console.log(req.body);

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
      const query = `UPDATE EXPIRATION SET 
      DISPOSITION = ?,
        COMMENT = ?
        WHERE EXPIRATION_ID = ?`;
      let modifiedComment = req.body.COMMENT || "";
      if (modifiedComment && !modifiedComment.endsWith('\n')) {
        modifiedComment += '\n';
      }
      const values = [
        req.body.DISPOSITION,
        modifiedComment,
        req.params.id,
      ];

      connection.query(query, values, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for expiry : " + err);
          res.sendStatus(500);
          return;
        }
        res.json(rows);
      });

      connection.end();
    });
  } catch (err) {
    console.log("Error connecting to Db 324");
    return;
  }
});


module.exports = router;
