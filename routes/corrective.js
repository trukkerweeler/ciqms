const express = require("express");
const router = express.Router();
const mysql = require("mysql2");
const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");

// ==================================================
// Corrective Action Folder Creation Function
function createCorrectiveFolder(correctiveId) {
  try {
    // Get 4-digit current year
    const currentYear = new Date().getFullYear().toString();

    const caFilesLocation = `K:\\Quality - Records\\10200 - Corrective Actions\\${currentYear}`;

    // Check if the year folder exists, if not create it
    if (!fs.existsSync(caFilesLocation)) {
      fs.mkdirSync(caFilesLocation, { recursive: true });
      console.log("Corrective Actions year folder created:", caFilesLocation);
    }

    // Create folder for this specific Corrective Action ID
    const correctiveFolderPath = path.join(caFilesLocation, correctiveId);

    if (!fs.existsSync(correctiveFolderPath)) {
      fs.mkdirSync(correctiveFolderPath, { recursive: true });
      console.log(
        "Corrective Action folder created:",
        correctiveId,
        "at",
        correctiveFolderPath
      );
    } else {
      console.log("Corrective Action folder already exists for:", correctiveId);
    }
  } catch (error) {
    console.error(
      "Error creating Corrective Action folder for",
      correctiveId,
      ":",
      error.message
    );
    // Don't throw error - folder creation failure shouldn't break corrective action creation
  }
}

// ==================================================
// Function to create folders for all open Corrective Actions (equivalent to makedirectory)
function makeCorrectiveFolders() {
  try {
    const currentYear = new Date().getFullYear().toString();
    const caFilesLocation = `K:\\Quality - Records\\10200 - Corrective Actions\\${currentYear}`;

    // Check if the year folder exists, if not create it
    if (!fs.existsSync(caFilesLocation)) {
      fs.mkdirSync(caFilesLocation, { recursive: true });
      console.log("Corrective Actions year folder created:", caFilesLocation);
    }

    // Get list of existing folders
    const existingFolders = fs.readdirSync(caFilesLocation);
    const hasFolders = existingFolders.map((folder) => folder.substring(0, 7)); // First 7 characters (CA ID)

    // Get all open Corrective Action records from database
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
          "Error connecting to DB for corrective folder creation:",
          err.stack
        );
        return;
      }

      const query =
        "SELECT CORRECTIVE_ID, CLOSED FROM CORRECTIVE WHERE CLOSED = 'N'";

      connection.query(query, (err, rows) => {
        if (err) {
          console.log(
            "Failed to query for Corrective Action folder creation:",
            err
          );
          connection.end();
          return;
        }

        rows.forEach((row) => {
          const correctiveId = row.CORRECTIVE_ID;

          // Create folder if it doesn't already exist
          if (!hasFolders.includes(correctiveId)) {
            try {
              const correctiveFolderPath = path.join(
                caFilesLocation,
                correctiveId
              );
              fs.mkdirSync(correctiveFolderPath, { recursive: true });
              console.log("Corrective Action folder created:", correctiveId);
            } catch (folderError) {
              console.error(
                "Error creating folder for",
                correctiveId,
                ":",
                folderError.message
              );
            }
          }
        });

        console.log("makeCorrectiveFolders done");
        connection.end();
      });
    });
  } catch (error) {
    console.error("Error in makeCorrectiveFolders:", error.message);
  }
}

// ==================================================
// Get all records
router.get("/", (req, res) => {
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

    const query = `SELECT c.CORRECTIVE_ID, TITLE, USER_DEFINED_2, USER_DEFINED_1,
      c.REQUEST_BY, c.ASSIGNED_TO, c.CORRECTIVE_DATE, c.REFERENCE,
      ia.CORRECTION_DATE, ia.ACTION_BY, c.CREATE_DATE, c.DUE_DATE,
      CLOSED, c.CLOSED_DATE
      FROM CORRECTIVE c
      LEFT JOIN CORRECTIVE_TREND ct ON c.CORRECTIVE_ID = ct.CORRECTIVE_ID
      LEFT JOIN CORRECTION ia ON c.CORRECTIVE_ID = ia.CORRECTIVE_ID
      LEFT JOIN CORRECTIVE_CTRL cc ON c.CORRECTIVE_ID = cc.CORRECTIVE_ID
      ORDER BY CLOSED, CORRECTIVE_ID DESC`;

    connection.query(query, (err, rows) => {
      if (err) {
        console.error("❌ Query failed:", err);
        res.status(500).json({ error: "Query execution failed" });
      } else {
        res.json(rows);
      }
      connection.end();
    });
  });
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
        'SELECT CURRENT_ID FROM SYSTEM_IDS where TABLE_NAME = "CORRECTIVE"';
      connection.query(query, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for attendance: " + err);
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
    console.log("Error connecting to Db 83");
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

      let closedDate = null;
      console.log(req.body.CLOSED_DATE);
      // if ((typeof(req.body.CLOSED_DATE) === 'undefined') || (req.body.CLOSED_DATE === '0000-00-00')) {
      if (typeof req.body.CLOSED_DATE !== "undefined") {
        closedDate = req.body.CLOSED_DATE;
      } else {
        closedDate = null;
      }
      // Change FIELDS to uppercase
      if (typeof req.body.ASSIGNED_TO === "string") {
        req.body.ASSIGNED_TO = req.body.ASSIGNED_TO.toUpperCase();
      }
      if (typeof req.body.REQUEST_BY === "string") {
        req.body.REQUEST_BY = req.body.REQUEST_BY.toUpperCase();
      }
      if (typeof req.body.PEOPLE_ID === "string") {
        req.body.PEOPLE_ID = req.body.PEOPLE_ID.toUpperCase();
      }
      if (typeof req.body.INSTRUCTOR === "string") {
        req.body.INSTRUCTOR = req.body.INSTRUCTOR.toUpperCase();
      }

      const query = `insert into CORRECTIVE (CORRECTIVE_ID
                    , USER_DEFINED_1
                    , REQUEST_BY
                    , ASSIGNED_TO
                    , CORRECTIVE_DATE
                    , DUE_DATE
                    , REFERENCE
                    , CLOSED
                    , TITLE
                    , CREATE_DATE
                    , CREATE_BY
                    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      const queryParams = [
        req.body.CORRECTIVE_ID,
        req.body.USER_DEFINED_1,
        req.body.REQUEST_BY,
        req.body.ASSIGNED_TO,
        req.body.CORRECTIVE_DATE,
        req.body.DUE_DATE,
        req.body.REFERENCE,
        req.body.CLOSED,
        req.body.TITLE,
        req.body.CREATE_DATE,
        req.body.CREATE_BY,
      ];

      connection.query(query, queryParams, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for corrective insert: " + err);
          res.sendStatus(500);
          return;
        }
        res.json(rows);
      });

      // Escape the single quotes if NC_TREND exists
      if (typeof req.body.NC_TREND === "string") {
        req.body.NC_TREND = req.body.NC_TREND.replace(/'/g, "\\'");
      } else {
        req.body.NC_TREND = "";
      }

      const insertQuery = `insert into CORRECTIVE_TREND (CORRECTIVE_ID, NC_TREND) values ('${req.body.CORRECTIVE_ID}', '${req.body.NC_TREND}')`;
      connection.query(insertQuery, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for corrective trend insert: " + err);
          res.sendStatus(500);
          return;
        }
      });

      const updateQuery = `UPDATE SYSTEM_IDS SET CURRENT_ID = '${req.body.CORRECTIVE_ID}' WHERE TABLE_NAME = 'CORRECTIVE'`;
      connection.query(updateQuery, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for corrective id update: " + err);
          res.sendStatus(500);
          return;
        }

        // Create Corrective Action folder after successful database insert
        createCorrectiveFolder(req.body.CORRECTIVE_ID);

        // Create project for the corrective action
        createCAProject(
          req.body.CORRECTIVE_ID,
          req.body.TITLE,
          req.body.ASSIGNED_TO
        );

        // Send email notification after successful creation
        sendCorrectiveEmail(req.body);
      });

      connection.end();
    });
  } catch (err) {
    console.log("Error connecting to Db (changes 196)");
    return;
  }
});

// ==================================================
// Send email notification for new corrective action
async function sendCorrectiveEmail(correctiveData) {
  try {
    // Get assignee email from PEOPLE table
    const connection = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      port: 3306,
      database: "quality",
    });

    connection.connect(async function (err) {
      if (err) {
        console.error("Error connecting to DB for email lookup:", err.stack);
        return;
      }

      const emailQuery = `SELECT WORK_EMAIL_ADDRESS FROM PEOPLE WHERE PEOPLE_ID = '${correctiveData.ASSIGNED_TO}'`;
      connection.query(emailQuery, async (err, rows) => {
        if (err) {
          console.error("Error querying for assignee email:", err);
          connection.end();
          return;
        }

        if (rows.length > 0 && rows[0].EMAIL) {
          const assigneeEmail = rows[0].EMAIL;

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
            to: assigneeEmail,
            subject: `Corrective Action Notification: ${correctiveData.CORRECTIVE_ID} - ${correctiveData.TITLE}`,
            text: `The following corrective action has been issued. Please review and take timely action. If you have any questions, please contact the quality manager.\n\n Title: ${
              correctiveData.TITLE
            }\n\n Description:\n${
              correctiveData.USER_DEFINED_1 || "No description provided"
            }\n\n Due Date: ${correctiveData.DUE_DATE}\n\n Reference: ${
              correctiveData.REFERENCE || "N/A"
            }\n\n Requested By: ${correctiveData.REQUEST_BY}\n\n`,
          };

          try {
            const info = await transporter.sendMail(mailOptions);
            console.log("Corrective action email sent to:", assigneeEmail);
          } catch (emailError) {
            console.error("Error sending corrective action email:", emailError);
          }
        } else {
          console.log(
            "No email found for assignee:",
            correctiveData.ASSIGNED_TO
          );
        }

        connection.end();
      });
    });
  } catch (error) {
    console.error("Error in sendCorrectiveEmail:", error);
  }
}

// ==================================================
// Create project for corrective action
function createCAProject(correctiveId, title, assignedTo) {
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
          "Error connecting to DB for project creation:",
          err.stack
        );
        return;
      }

      const projectId = "CAR" + correctiveId;
      const createDate = new Date()
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");

      const query = `INSERT INTO PROJECT (PROJECT_ID, PROJECT_TYPE, NAME, LEADER, CREATE_BY, CREATE_DATE, CLOSED) 
                     VALUES (?, 'CAR', ?, ?, 'CIQMS', ?, 'N')`;
      const values = [projectId, title, assignedTo, createDate];

      connection.query(query, values, (err, result) => {
        if (err) {
          console.error("Failed to create project for corrective action:", err);
          connection.end();
          return;
        }

        console.log(
          `Project ${projectId} created for corrective action ${correctiveId}`
        );

        // Update CORRECTIVE table with project reference
        const updateQuery = `UPDATE CORRECTIVE SET PROJECT_ID = ? WHERE CORRECTIVE_ID = ?`;
        connection.query(updateQuery, [projectId, correctiveId], (err) => {
          if (err) {
            console.error("Failed to update corrective with project_id:", err);
          }
          connection.end();
        });

        // Create RCA and ICA inputs after project is created
        createRCAInput(projectId, assignedTo);
        createICAInput(projectId, assignedTo);
      });
    });
  } catch (error) {
    console.error("Error in createCAProject:", error);
  }
}

// ==================================================
// Create Root Cause Analysis input
function createRCAInput(projectId, assignedTo) {
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
          "Error connecting to DB for RCA input creation:",
          err.stack
        );
        return;
      }

      // Check if RCA input already exists
      const checkQuery = `SELECT INPUT_ID FROM PEOPLE_INPUT WHERE PROJECT_ID = ? AND SUBJECT = 'RCA'`;
      connection.query(checkQuery, [projectId], (err, rows) => {
        if (err || (rows && rows.length > 0)) {
          connection.end();
          return;
        }

        // Get next input ID
        const getIdQuery = `SELECT CURRENT_ID FROM SYSTEM_IDS WHERE TABLE_NAME = 'PEOPLE_INPUT'`;
        connection.query(getIdQuery, (err, idRows) => {
          if (err || !idRows || idRows.length === 0) {
            console.error("Failed to get next input ID:", err);
            connection.end();
            return;
          }

          const nextId = (parseInt(idRows[0].CURRENT_ID) + 1)
            .toString()
            .padStart(7, "0");
          const createDate = new Date()
            .toISOString()
            .slice(0, 19)
            .replace("T", " ");
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 30);
          const dueDateStr = dueDate.toISOString().slice(0, 10);

          const text =
            "Please provide root cause analysis. Use 5-why methodology for determining root cause. Root cause cannot be a restatement of the finding.";

          const insertQuery = `INSERT INTO PEOPLE_INPUT (INPUT_ID, INPUT_DATE, PEOPLE_ID, ASSIGNED_TO, DUE_DATE, INPUT_TYPE, SUBJECT, PROJECT_ID, CLOSED, CREATE_DATE, CREATE_BY) 
                               VALUES (?, ?, 'TKENT', ?, ?, 'A', 'RCA', ?, 'N', ?, 'CIQMS')`;
          const values = [
            nextId,
            createDate,
            assignedTo,
            dueDateStr,
            projectId,
            createDate,
          ];

          connection.query(insertQuery, values, (err) => {
            if (err) {
              console.error("Failed to create RCA input:", err);
              connection.end();
              return;
            }

            // Insert input text
            const textQuery = `INSERT INTO PPL_INPT_TEXT (INPUT_ID, INPUT_TEXT) VALUES (?, ?)`;
            connection.query(textQuery, [nextId, text], (err) => {
              if (err) {
                console.error("Failed to insert RCA input text:", err);
              }

              // Update system ID
              const updateIdQuery = `UPDATE SYSTEM_IDS SET CURRENT_ID = ? WHERE TABLE_NAME = 'PEOPLE_INPUT'`;
              connection.query(updateIdQuery, [nextId], (err) => {
                if (err) {
                  console.error("Failed to update input system ID:", err);
                }
                console.log(
                  `RCA input ${nextId} created for project ${projectId}`
                );
                connection.end();
              });
            });
          });
        });
      });
    });
  } catch (error) {
    console.error("Error in createRCAInput:", error);
  }
}

// ==================================================
// Create Immediate Corrective Action input
function createICAInput(projectId, assignedTo) {
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
          "Error connecting to DB for ICA input creation:",
          err.stack
        );
        return;
      }

      // Check if ICA input already exists
      const checkQuery = `SELECT INPUT_ID FROM PEOPLE_INPUT WHERE PROJECT_ID = ? AND SUBJECT = 'ICA'`;
      connection.query(checkQuery, [projectId], (err, rows) => {
        if (err || (rows && rows.length > 0)) {
          connection.end();
          return;
        }

        // Get next input ID
        const getIdQuery = `SELECT CURRENT_ID FROM SYSTEM_IDS WHERE TABLE_NAME = 'PEOPLE_INPUT'`;
        connection.query(getIdQuery, (err, idRows) => {
          if (err || !idRows || idRows.length === 0) {
            console.error("Failed to get next input ID:", err);
            connection.end();
            return;
          }

          const nextId = (parseInt(idRows[0].CURRENT_ID) + 1)
            .toString()
            .padStart(7, "0");
          const createDate = new Date()
            .toISOString()
            .slice(0, 19)
            .replace("T", " ");
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 30);
          const dueDateStr = dueDate.toISOString().slice(0, 10);

          const text =
            "Please take immediate action to correct the issue. Document the action taken and the results of the action including dates.";

          const insertQuery = `INSERT INTO PEOPLE_INPUT (INPUT_ID, INPUT_DATE, PEOPLE_ID, ASSIGNED_TO, DUE_DATE, INPUT_TYPE, SUBJECT, PROJECT_ID, CLOSED, CREATE_DATE, CREATE_BY) 
                               VALUES (?, ?, 'TKENT', ?, ?, 'A', 'ICA', ?, 'N', ?, 'CIQMS')`;
          const values = [
            nextId,
            createDate,
            assignedTo,
            dueDateStr,
            projectId,
            createDate,
          ];

          connection.query(insertQuery, values, (err) => {
            if (err) {
              console.error("Failed to create ICA input:", err);
              connection.end();
              return;
            }

            // Insert input text
            const textQuery = `INSERT INTO PPL_INPT_TEXT (INPUT_ID, INPUT_TEXT) VALUES (?, ?)`;
            connection.query(textQuery, [nextId, text], (err) => {
              if (err) {
                console.error("Failed to insert ICA input text:", err);
              }

              // Update system ID
              const updateIdQuery = `UPDATE SYSTEM_IDS SET CURRENT_ID = ? WHERE TABLE_NAME = 'PEOPLE_INPUT'`;
              connection.query(updateIdQuery, [nextId], (err) => {
                if (err) {
                  console.error("Failed to update input system ID:", err);
                }
                console.log(
                  `ICA input ${nextId} created for project ${projectId}`
                );
                connection.end();
              });
            });
          });
        });
      });
    });
  } catch (error) {
    console.error("Error in createICAInput:", error);
  }
}

// ==================================================
// Manual trigger for creating all Corrective Action folders
router.post("/create-folders", (req, res) => {
  try {
    makeCorrectiveFolders();
    res.json({
      success: true,
      message:
        "Corrective Action folder creation process started. Check server logs for progress.",
    });
  } catch (error) {
    console.error("Error starting Corrective Action folder creation:", error);
    res.status(500).json({
      success: false,
      error: "Failed to start folder creation process",
    });
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
      subject: `Corrective Action Notification: ${req.body.CORRECTIVE_ID} - ${req.body.TITLE}`,
      text: `The following corrective action has been issued. Please review and take timely action. If you have any questions, please contact the quality manager.\n\n Title: ${
        req.body.TITLE
      }\n\n Description:\n${
        req.body.USER_DEFINED_1 || "No description provided"
      }\n\n Due Date: ${req.body.DUE_DATE}\n\n Reference: ${
        req.body.REFERENCE || "N/A"
      }\n\n`,
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

      const query = `select c.CORRECTIVE_ID
        , TITLE
        , USER_DEFINED_2
        , USER_DEFINED_1
        , c.REQUEST_BY
        , c.ASSIGNED_TO
        , c.CORRECTIVE_DATE
        , c.REFERENCE
        , c.PROJECT_ID
        , c.CORR_ACTION_DATE
        , ia.CORRECTION_DATE
        , ia.ACTION_BY
        , cc.CREATE_DATE
        , DUE_DATE
        , CLOSED
        , c.CLOSED_DATE
        , ct.NC_TREND
        , ia.CORRECTION_TEXT
        , cc.CONTROL_TEXT
        , cc.CAUSE_TEXT
        from CORRECTIVE c
        left join CORRECTIVE_TREND ct on c.CORRECTIVE_ID = ct.CORRECTIVE_ID            
        left join CORRECTION ia on c.CORRECTIVE_ID = ia.CORRECTIVE_ID
        left join CORRECTIVE_CTRL cc on c.CORRECTIVE_ID = cc.CORRECTIVE_ID
        where c.CORRECTIVE_ID = '${req.params.id}'`;

      // console.log(query);

      connection.query(query, (err, rows, fields) => {
        if (err) {
          console.log("250 Failed to query for corrective actions: " + err);
          res.sendStatus(500);
          return;
        }
        res.json(rows);
      });

      connection.end();
    });
  } catch (err) {
    console.log("Error connecting to Db 251");
    return;
  }
});

// PUTPUTPUTPUTPPUTPUTPPUTPUTPPUTPUTPPUTPUTPPUTPUTPPUTPUTPPUTPUTPPUTPUTPPUTPUTPPUTPUTP
router.put("/:id", (req, res) => {
  // console.log("Params: " + req.params.id);
  // console.log(req.body);
  let mytable = "";
  let appended = "";
  let query = "";
  const myfield = Object.keys(req.body)[1];
  // console.log("My field: " + myfield);
  switch (myfield) {
    case "CAUSE_TEXT":
      mytable = "CORRECTIVE_CTRL";
      appended = req.body.CAUSE_TEXT;
      appended = appended.replace(/<br>/g, "\n");
      query = `insert into CORRECTIVE_CTRL (CORRECTIVE_ID, CAUSE_TEXT) values ('${req.params.id}','${appended}') on duplicate key update CAUSE_TEXT = '${appended}';`;
      break;
    case "CONTROL_TEXT":
      mytable = "CORRECTIVE_CTRL";
      // console.log(mytable);
      appended = req.body.CONTROL_TEXT;
      appended = appended.replace(/<br>/g, "\n");
      // query = `insert into CORRECTIVE_CTRL (CORRECTIVE_ID, CONTROL_TEXT, MODIFIED_DATE) values ('${req.params.id}','${appended}', NOW()) on duplicate key update CONTROL_TEXT = '${appended}';`;
      query = `
  INSERT INTO CORRECTIVE_CTRL (
    CORRECTIVE_ID, CONTROL_TEXT, MODIFIED_DATE, CREATE_DATE, CREATE_BY
  ) VALUES (
    '${req.params.id}', '${appended}', NOW(), NOW(), '${req.body.MODIFIED_BY}'
  )
  ON DUPLICATE KEY UPDATE 
    CONTROL_TEXT = '${appended}',
    MODIFIED_DATE = NOW(),
    CREATE_DATE = IF(CREATE_DATE IS NULL, NOW(), CREATE_DATE),
    CREATE_BY = IF(CREATE_BY IS NULL OR CREATE_BY = '', '${req.body.MODIFIED_BY}', CREATE_BY);
`;
      // console.log(query);
      break;
    case "CORRECTION_TEXT":
      mytable = "CORRECTION";
      let correctiondate = req.body.CORRECTION_DATE;
      let actionby = req.body.ACTION_BY;
      appended = req.body.CORRECTION_TEXT.replace(/<br>/g, "\n");
      // Escape single quotes to prevent SQL syntax errors
      appended = appended.replace(/'/g, "''");
      query = `insert into CORRECTION (CORRECTIVE_ID, CORRECTION_DATE, ACTION_BY, CORRECTION_TEXT) values ('${req.params.id}', '${correctiondate}', '${actionby}','${appended}') on duplicate key update CORRECTION_TEXT = '${appended}', CORRECTION_DATE = '${correctiondate}', ACTION_BY = '${actionby}';`;
      //   console.log(query);
      break;
    default:
      mytable = "CORRECTIVE";
      // if PROJECT is undefined, set it to zero length string
      if (typeof req.body.PROJECT_ID === "undefined") {
        req.body.PROJECT_ID = "";
      }
      query = `UPDATE CORRECTIVE SET ASSIGNED_TO = '${req.body.ASSIGNED_TO}', REQUEST_BY = '${req.body.REQUEST_BY}', REFERENCE = '${req.body.REFERENCE}', PROJECT_ID = '${req.body.PROJECT_ID}' WHERE CORRECTIVE_ID = '${req.params.id}'`;
    // console.log(query);
  }
  // Replace the br with a newline
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

      // q1 = `insert ignore into ${mytable} (CORRECTIVE_ID, CREATE_DATE) values ('${req.params.id}, now()')`
      connection.query(query, (err, rows, fields) => {
        if (err) {
          console.log("349 Failed to query for corrective actions: " + err);
          res.sendStatus(500);
          return;
        }
        res.json(rows);
      });

      if (myfield === "CONTROL_TEXT") {
        // update the CORR_ACTION_DATE
        const updateQuery = `UPDATE CORRECTIVE SET CORR_ACTION_DATE = NOW() WHERE CORRECTIVE_ID = '${req.params.id}'`;
        connection.query(updateQuery, (err, rows, fields) => {
          if (err) {
            console.log("Failed to query for corr_action_date update: " + err);
            res.sendStatus(500);
            return;
          }
        });
      }
      connection.end();
    });
  } catch (err) {
    console.log("Error connecting to Db 315");
  }
  return;
});

// ==================================================CLOSE
router.put(
  "/:id/close",
  (req, res) => {
    // console.log("Params: " + req.params.id);
    console.log(req.body);
    let query = "";
    // closed date is locale time string
    let myNow = new Date().toLocaleString();
    let myDate = myNow.split("/").reverse().join("-");

    console.log({ myDate });

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

        const query = `UPDATE CORRECTIVE SET 
            CLOSED = '${req.body.CLOSED}'
            , CLOSED_DATE = '${req.body.CLOSED_DATE}'
            , MODIFIED_BY = '${req.body.MODIFIED_BY}'
            , MODIFIED_DATE = now() 
            WHERE CORRECTIVE_ID = '${req.params.id}'`;
        // console.log(query);
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
      console.log("Error connecting to Db 315");
    }
    return;
  }

  // alert('Put not implemented yet');
);

module.exports = router;
