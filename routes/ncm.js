const express = require("express");
const router = express.Router();
const mysql = require("mysql2");
const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");
let test = false;
// ...existing code...
// ==================================================
// Get all closed records
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
      const query = `select n.NCM_ID
        , n.NCM_DATE
        , n.NCM_TYPE
        , n.SUBJECT
        , n.ASSIGNED_TO
        , n.DUE_DATE        
        , n.PRODUCT_ID
        , n.PO_NUMBER
        , n.PROCESS_ID
        , ne.DESCRIPTION
        , n.CLOSED
        from NONCONFORMANCE n 
        left join NCM_DESCRIPTION ne on n.NCM_ID = ne.NCM_ID
        left join NCM_DISPOSITION ni on n.NCM_ID = ni.NCM_ID
        left join NCM_VERIFICATION nv on n.NCM_ID = nv.NCM_ID
        where n.CLOSED = 'Y'
        order by n.NCM_ID desc`;

      connection.query(query, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for closed NCMs: " + err);
          res.sendStatus(500);
          return;
        }
        res.json(rows);
      });

      connection.end();
    });
  } catch (err) {
    console.log("Error connecting to Db (closed NCMs)");
    return;
  }
});
// ...existing code...

// ==================================================
// NCM Folder Creation Function
function createNcmFolder(ncmId) {
  try {
    // Get 4-digit current year
    const thisYear = new Date().getFullYear().toString();
    const lastYear = (new Date().getFullYear() - 1).toString();

    const basePath =
      "K:\\Quality - Records\\8700 - Control of Nonconforming Product";
    const lyPath = path.join(basePath, lastYear);
    const tyPath = path.join(basePath, thisYear);

    // Check if the current year path exists, if not create it
    if (!fs.existsSync(tyPath)) {
      fs.mkdirSync(tyPath, { recursive: true });
      console.log("Year path created:", tyPath);
    }

    // Create folder for this specific NCM ID
    const ncmFolderPath = path.join(tyPath, ncmId);

    // Check if folder already exists in either year
    const lyNcmPath = path.join(lyPath, ncmId);

    if (!fs.existsSync(lyNcmPath) && !fs.existsSync(ncmFolderPath)) {
      fs.mkdirSync(ncmFolderPath, { recursive: true });
      console.log("NCM folder created:", ncmId, "at", ncmFolderPath);
    } else {
      console.log("NCM folder already exists for:", ncmId);
    }
  } catch (error) {
    console.error("Error creating NCM folder for", ncmId, ":", error.message);
    // Don't throw error - folder creation failure shouldn't break NCM creation
  }
}

// ==================================================
// Function to create folders for all open NCMs (equivalent to makeNcmFolders)
function makeNcmFolders() {
  try {
    // Get 4-digit current year
    const thisYear = new Date().getFullYear().toString();
    const lastYear = (new Date().getFullYear() - 1).toString();

    const basePath =
      "K:\\Quality - Records\\8700 - Control of Nonconforming Product";
    const lyPath = path.join(basePath, lastYear);
    const tyPath = path.join(basePath, thisYear);

    // Check if the current year path exists, if not create it
    if (!fs.existsSync(tyPath)) {
      fs.mkdirSync(tyPath, { recursive: true });
      console.log("Year path created:", tyPath);
    }

    // Get all open NCM records from database
    const connection = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      port: 3306,
      database: "quality",
    });

    connection.connect(function (err) {
      if (err) {
        console.error("Error connecting to DB for folder creation:", err.stack);
        return;
      }

      const query =
        "SELECT NCM_ID, CLOSED FROM NONCONFORMANCE WHERE CLOSED = 'N'";

      connection.query(query, (err, rows) => {
        if (err) {
          console.log("Failed to query for NCM folder creation:", err);
          connection.end();
          return;
        }

        rows.forEach((row) => {
          const ncmId = row.NCM_ID;
          const lyNcmPath = path.join(lyPath, ncmId);
          const tyNcmPath = path.join(tyPath, ncmId);

          // Create folder if it doesn't exist in either year
          if (!fs.existsSync(lyNcmPath) && !fs.existsSync(tyNcmPath)) {
            try {
              fs.mkdirSync(tyNcmPath, { recursive: true });
              console.log("NCM folder created:", ncmId);
            } catch (folderError) {
              console.error(
                "Error creating folder for",
                ncmId,
                ":",
                folderError.message
              );
            }
          }
        });

        console.log("makeNcmFolders done");
        connection.end();
      });
    });
  } catch (error) {
    console.error("Error in makeNcmFolders:", error.message);
  }
}

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

      const query = `select n.NCM_ID
        , n.NCM_DATE
        , n.NCM_TYPE
        , n.SUBJECT
        , n.ASSIGNED_TO
        , n.DUE_DATE        
        , n.PRODUCT_ID
        , n.PO_NUMBER
        , n.PROCESS_ID
        , ne.DESCRIPTION
        , n.CLOSED
        from NONCONFORMANCE n 
        left join NCM_DESCRIPTION ne on n.NCM_ID = ne.NCM_ID
        left join NCM_DISPOSITION ni on n.NCM_ID = ni.NCM_ID
        left join NCM_VERIFICATION nv on n.NCM_ID = nv.NCM_ID
        order by n.CLOSED, n.NCM_ID desc`;

      // from NONCONFORMANCE n left join PPL_INPT_TEXT pit on pi.INPUT_ID = pit.INPUT_ID order by pi.INPUT_ID desc`;
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
        'SELECT CURRENT_ID FROM SYSTEM_IDS where TABLE_NAME = "NONCONFORMANCE"';
      connection.query(query, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for nonconformance: " + err);
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
    console.log("Error connecting to Db 100");
    return;
  }
});

// ==================================================
// Send email using nodemailer
router.post("/email", async (req, res) => {
  try {
    // SMTP debug flag - set to true to enable detailed SMTP logging
    const SMTP_DEBUG = false;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: true, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      debug: SMTP_DEBUG, // Enable/disable SMTP debugging
    });

    const mailOptions = {
      from: process.env.SMTP_FROM,
      to: req.body.ASSIGNED_TO_EMAIL,
      subject: `Nonconformance Notification: ${req.body.NCM_ID} - ${req.body.PRODUCT_ID}`,
      text: `The following nonconformance has been issued. Please review and take timely action. If you have any questions, please contact the quality manager.\n\n Description:\n${req.body.DESCRIPTION} \n\n`,
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
// update NCM_NOTIFY table
router.post("/ncm_notify", (req, res) => {
  // console.log("post ncm_notify");
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
      const query = `INSERT INTO NCM_NOTIFY (NCM_ID, ACTION, NOTIFIED_DATE, ASSIGNED_TO ) VALUES (?, ?, NOW(), ?)`;
      const values = [req.body.NCM_ID, req.body.ACTION, req.body.ASSIGNED_TO];
      // console.log(query);
      // console.log(values);
      connection.query(query, values, (err) => {
        if (err) {
          console.log("Failed to query for ncm notify: " + err);
          res.sendStatus(500);
          return;
        }
        res.sendStatus(200);
      });
      connection.end();
    });
  } catch (err) {
    console.log("Error connecting to Db 140");
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
      // console.log('Connected to DB');

      const query = `insert into NONCONFORMANCE (NCM_ID
            , NCM_DATE
            , PEOPLE_ID
            , CUSTOMER_ID
            , SUPPLIER_ID
            , ASSIGNED_TO
            , DUE_DATE
            , NCM_TYPE
            , SUBJECT
            , CAUSE
            , PRODUCT_ID
            , PO_NUMBER
            , LOT_SIZE
            , LOT_NUMBER
            , USER_DEFINED_1
            , CLOSED
            , CREATE_DATE
            , CREATE_BY
            ) values (
                '${req.body.NCM_ID}'
                , '${req.body.NCM_DATE}'
                , '${req.body.PEOPLE_ID}'
                , '${req.body.CUSTOMER_ID}'
                , '${req.body.SUPPLIER_ID}'
                , '${req.body.ASSIGNED_TO}'
                , '${req.body.DUE_DATE}'
                , '${req.body.NCM_TYPE}'
                , '${req.body.SUBJECT}'
                , '${req.body.CAUSE}'
                , '${req.body.PRODUCT_ID}'
                , '${req.body.PO_NUMBER}'
                , '${req.body.LOT_SIZE}'
                , '${req.body.LOT_NUMBER}'
                , '${req.body.USER_DEFINED_1}'
                , '${req.body.CLOSED}'
                , '${req.body.CREATE_DATE}'
                , '${req.body.CREATE_BY}'
            )`;

      // console.log(query);

      connection.query(query, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for PEOPLE_INPUT insert: " + err);
          res.sendStatus(500);
          return;
        }
        res.json(rows);
      });

      // escape the apostrophe
      const ncmDesc = req.body.DESCRIPTION.replace(/'/g, "\\'");
      // console.log(".post 167: " + ncmDesc);
      // escape the backslash
      const nid = req.body.NCM_ID;
      // const ncmDesc = req.body.DESCRIPTION.replace(/\\/g, "\\\\");
      const insertQuery = `insert into NCM_DESCRIPTION values ('${nid}', '${ncmDesc}')`;
      connection.query(insertQuery, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for NONCONFORMANCE insert: " + err);
          res.sendStatus(500);
          return;
        }
      });

      const updateQuery = `UPDATE SYSTEM_IDS SET CURRENT_ID = '${req.body.NCM_ID}' WHERE TABLE_NAME = 'NONCONFORMANCE'`;
      connection.query(updateQuery, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for system id update: " + err);
          res.sendStatus(500);
          return;
        }

        // Create NCM folder after successful database insert
        createNcmFolder(req.body.NCM_ID);
      });

      connection.end();
    });
  } catch (err) {
    console.log("Error connecting to Db 205");
    return;
  }
});

// ==================================================
// Manual trigger for creating all NCM folders
router.post("/create-folders", (req, res) => {
  try {
    makeNcmFolders();
    res.json({
      success: true,
      message:
        "NCM folder creation process started. Check server logs for progress.",
    });
  } catch (error) {
    console.error("Error starting NCM folder creation:", error);
    res.status(500).json({
      success: false,
      error: "Failed to start folder creation process",
    });
  }
});

// ==================================================
// Get subjects from SUBJECT table (MUST be before /:id route)
router.get("/subjects", (req, res) => {
  //   console.log("=== SUBJECTS ROUTE HIT ===");
  //   console.log("Request URL:", req.url);
  //   console.log("Request method:", req.method);
  //   console.log("Timestamp:", new Date().toISOString());

  const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    port: 3306,
    database: "quality",
  });

  connection.connect(function (err) {
    if (err) {
      console.log("=== DB CONNECTION ERROR ===", err);
      res.status(500).json({ error: "Database connection failed" });
      return;
    }

    // console.log("=== DB CONNECTED FOR SUBJECTS ===");
    const query = "SELECT SUBJECT, DESCRIPTION FROM SUBJECT ORDER BY SUBJECT";
    // console.log("=== EXECUTING QUERY ===", query);

    connection.query(query, (err, rows, fields) => {
      if (err) {
        console.log("=== QUERY ERROR ===", err);
        connection.end();
        res.status(500).json({ error: "Query failed", details: err.message });
        return;
      }

      //   console.log("=== QUERY SUCCESS ===");
      //   console.log("Rows returned:", rows.length);
      //   console.log("Sample data:", JSON.stringify(rows.slice(0, 2), null, 2));

      res.json(rows);
      connection.end();
      //   console.log("=== RESPONSE SENT ===");
    });
  });
});

// Simple test route to verify routing is working (MUST be before /:id route)
router.get("/test", (req, res) => {
  console.log("=== TEST ROUTE HIT ===");
  res.json({
    message: "Test route working",
    timestamp: new Date().toISOString(),
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
        n.NCM_ID
        , n.PEOPLE_ID
        , NCM_DATE
        , n.DUE_DATE
        , n.ASSIGNED_TO
        , n.CUSTOMER_ID
        , n.SUPPLIER_ID
        , NCM_TYPE
        , n.SUBJECT
        , n.CAUSE
        , n.CLOSED
        , n.CLOSED_DATE
        , n.PRODUCT_ID
        , n.PO_NUMBER
        , n.LOT_SIZE
        , n.LOT_NUMBER
        , n.USER_DEFINED_1
        , ne.DESCRIPTION
        , ni.DISPOSITION
        , nv.VERIFICATION
        , nn.NCM_NOTE
        FROM quality.NONCONFORMANCE n 
        left join NCM_DESCRIPTION ne on n.NCM_ID = ne.NCM_ID
        left join NCM_DISPOSITION ni on n.NCM_ID = ni.NCM_ID
        left join NCM_VERIFICATION nv on n.NCM_ID = nv.NCM_ID 
        left join NCM_NOTES nn on n.NCM_ID = nn.NCM_ID 
        where n.NCM_ID = '${req.params.id}'`;

      // console.log(query);

      connection.query(query, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for nonconformance: " + err);
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

router.put("/:id", (req, res) => {
  // console.log("Params: " + req.params.id);
  // console.log(req.body);
  test = false;
  let mytable = "";
  let appended = "";
  const myfield = Object.keys(req.body)[2];
  if (test) {
    console.log("279 - My field: " + myfield);
  }
  switch (myfield) {
    case "DESCRIPTION":
      mytable = "NCM_DESCRIPTION";
      appended = req.body.DESCRIPTION.replace(/'/g, "/''");
      break;
    case "DISPOSITION":
      mytable = "NCM_DISPOSITION";
      appended = req.body.DISPOSITION.replace(/'/g, "/''");
      break;
    case "VERIFICATION":
      mytable = "NCM_VERIFICATION";
      appended = req.body.VERIFICATION.replace(/'/g, "/''");
      break;
    case "NCM_NOTE":
      mytable = "NCM_NOTES";
      appended = req.body.NCM_NOTE.replace(/'/g, "/''");
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
        NCM_ID = '${req.params.id}',
        ${myfield} = '${appended}'`;
      if (test) {
        console.log(query);
      }
      connection.query(query, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for nonconformance : " + err);
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
// Update details
router.put("/details/:id", (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`=== NCM DETAILS UPDATE ${timestamp} ===`);
  console.log("Request body:", req.body);
  console.log("CAUSE value:", req.body.CAUSE);
  console.log("CAUSE type:", typeof req.body.CAUSE);

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
      const query = `UPDATE NONCONFORMANCE SET 
        NCM_DATE = '${req.body.NCM_DATE || ""}',
        DUE_DATE = '${req.body.DUE_DATE || ""}',
        PEOPLE_ID = '${req.body.PEOPLE_ID || ""}',
        CUSTOMER_ID = '${req.body.CUSTOMER_ID || ""}',
        SUPPLIER_ID = '${req.body.SUPPLIER_ID || ""}',
        ASSIGNED_TO = '${req.body.ASSIGNED_TO || ""}',
        NCM_TYPE = '${req.body.NCM_TYPE || ""}',
        SUBJECT = '${req.body.SUBJECT || ""}',
        CAUSE = '${req.body.CAUSE || ""}',
        PRODUCT_ID = '${req.body.PRODUCT_ID || ""}',
        LOT_SIZE = '${req.body.LOT_SIZE || ""}',
        LOT_NUMBER = '${req.body.LOT_NUMBER || ""}',
        USER_DEFINED_1 = '${req.body.USER_DEFINED_1 || ""}',
        MODIFIED_DATE = '${req.body.MODIFIED_DATE || ""}',
        MODIFIED_BY = '${req.body.MODIFIED_BY || ""}'
        WHERE NCM_ID = '${req.params.id}'`;

      console.log("Generated SQL Query:");
      console.log(query);
      console.log("Query length:", query.length);
      console.log("Params ID:", req.params.id);

      connection.query(query, (err, rows, fields) => {
        if (err) {
          console.log("SQL ERROR DETAILS:");
          console.log("Error message:", err.message);
          console.log("Error code:", err.code);
          console.log("Error errno:", err.errno);
          console.log("Failed to query for nonconformance: " + err);
          res.sendStatus(500);
          return;
        }
        console.log("NCM update successful!");

        // Verify the update by reading back the CAUSE field
        const verifyQuery = `SELECT CAUSE FROM NONCONFORMANCE WHERE NCM_ID = '${req.params.id}'`;
        connection.query(verifyQuery, (verifyErr, verifyRows) => {
          if (!verifyErr && verifyRows.length > 0) {
            console.log(
              "Verification - CAUSE field in DB:",
              verifyRows[0].CAUSE
            );
          }
        });

        res.json(rows);
      });

      connection.end();
    });
  } catch (err) {
    console.log("Error connecting to Db 376");
    return;
  }
});

// CLOSE THE NCM<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
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
      const query = `UPDATE NONCONFORMANCE SET CLOSED = 'Y', CLOSED_DATE = '${req.body.CLOSED_DATE}' WHERE NCM_ID = '${req.params.id}'`;
      // console.log(query);

      connection.query(query, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for nonconformance 410 : " + err);
          res.sendStatus(500);
          return;
        }
        res.json(rows);
      });

      connection.end();
    });
  } catch (err) {
    console.log("Error connecting to Db 420");
    return;
  }
});

// ==================================================
// Get previous records
router.get("/previous/:id", (req, res) => {
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

      const query = `with subjects as (select * from PEOPLE_INPUT where SUBJECT = (select SUBJECT from PEOPLE_INPUT where INPUT_ID = '${req.params.id}')) select * from PPL_INPT_RSPN pir join subjects on pir.INPUT_ID = subjects.INPUT_ID order by pir.INPUT_ID desc limit 5`;

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
    console.log("Error connecting to Db 461");
    return;
  }
});

module.exports = router;
