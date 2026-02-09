const express = require("express");
const router = express.Router();
const mysql = require("mysql2");
const fs = require("fs");
const path = require("path");

// Helper function to move file from _to-enter to _entered
function moveCompetencyFile(linkPath) {
  if (!linkPath) {
    return { success: true };
  }

  // Check if it's a K: drive path or UNC path
  const toEnterK = "K:\\Quality - Records\\7200 - Competency\\_to-enter\\";
  const enteredK = "K:\\Quality - Records\\7200 - Competency\\_entered\\";
  const toEnterUNC =
    "\\\\fs1\\Common\\Quality - Records\\7200 - Competency\\_to-enter\\";
  const enteredUNC =
    "\\\\fs1\\Common\\Quality - Records\\7200 - Competency\\_entered\\";

  try {
    let sourcePath = null;
    let destPath = null;
    let filename = path.basename(linkPath);

    // Check which format the link is in
    if (linkPath.toLowerCase().startsWith(toEnterK.toLowerCase())) {
      sourcePath = linkPath;
      destPath = path.join(enteredK, filename);
    } else if (linkPath.toLowerCase().startsWith(toEnterUNC.toLowerCase())) {
      sourcePath = linkPath;
      destPath = path.join(enteredUNC, filename);
    } else {
      // If it's just a filename without a path, assume it's in the _to-enter directory on K: drive
      sourcePath = path.join(toEnterK, filename);
      destPath = path.join(enteredK, filename);
    }

    // Check if source file exists
    const fileExists = fs.existsSync(sourcePath);

    if (!fileExists) {
      return { success: false, error: `Source file not found: ${sourcePath}` };
    }

    // Ensure destination directory exists
    const destDir = path.dirname(destPath);

    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    // Move the file (rename from _to-enter to _entered)
    fs.renameSync(sourcePath, destPath);
    return { success: true };
  } catch (error) {
    // Detect if file is locked/in use (common EBUSY or EACCES errors)
    const isFileLocked =
      error.code === "EBUSY" ||
      error.code === "EACCES" ||
      error.message.includes("used by another process") ||
      error.message.includes("Permission denied");

    return {
      success: false,
      error: error.message,
      isFileLocked: isFileLocked,
    };
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

      const query = `SELECT ca.COURSE_ATND_ID, ca.COURSE_ID, ca.DATE_TIME, ca.PEOPLE_ID, ca.INSTRUCTOR, ca.MINUTES, ca.CREATE_BY, ca.CREATED_DATE, cal.CTA_ATTENDANCE_LINK
        FROM CTA_ATTENDANCE ca
        LEFT JOIN CTA_ATTENDANCE_LINK cal ON ca.COURSE_ATND_ID = cal.COURSE_ATND_ID
        ORDER BY ca.DATE_TIME DESC`;

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

    // res.send('Hello Corrective!');
  } catch (err) {
    console.log("Error connecting to Db");
    return;
  }
});

// Get the next ID for a new attendance record
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

      const query =
        'SELECT CURRENT_ID FROM SYSTEM_IDS where TABLE_NAME = "CTA_ATTENDANCE"';
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
      // console.log('Connected to DB');

      const query = `insert into CTA_ATTENDANCE (COURSE_ATND_ID
            , COURSE_ID
            , DATE_TIME
            , PEOPLE_ID
            , INSTRUCTOR
            , MINUTES
            , CREATE_BY
            , CREATED_DATE) 
        values 
        (?, ?, ?, ?, ?, ?, ?, ?)`;

      const values = [
        req.body.COURSE_ATND_ID,
        req.body.COURSE_ID,
        req.body.DATE_TIME,
        req.body.PEOPLE_ID,
        req.body.INSTRUCTOR,
        req.body.MINUTES,
        req.body.CREATE_BY,
        req.body.CREATED_DATE,
      ];

      connection.query(query, values, (err, rows, fields) => {
        if (err) {
          console.log("Failed to query for attendance insert: " + err);
          res.sendStatus(500);
          connection.end();
          return;
        }

        // If there's a LINK field, insert it into CTA_ATTENDANCE_LINK table
        if (req.body.LINK && req.body.LINK.trim() !== "") {
          // Only attempt to move the file if this is the first record
          let moveResult = { success: true };
          let movedFilePath = req.body.LINK;

          if (req.body.moveFileOnFirstRecord) {
            moveResult = moveCompetencyFile(req.body.LINK);
            if (moveResult.success) {
              // Calculate the moved path for returning to client
              const path = require("path");
              const filename = path.basename(req.body.LINK);
              // Check if it's a K: drive path or UNC path
              if (req.body.LINK.toLowerCase().startsWith("K:\\")) {
                movedFilePath =
                  "K:\\Quality - Records\\7200 - Competency\\_entered\\" +
                  filename;
              } else if (req.body.LINK.toLowerCase().startsWith("\\\\")) {
                movedFilePath =
                  "\\\\fs1\\Common\\Quality - Records\\7200 - Competency\\_entered\\" +
                  filename;
              }
            }
          }

          const linkQuery =
            "INSERT INTO CTA_ATTENDANCE_LINK (COURSE_ATND_ID, CTA_ATTENDANCE_LINK) VALUES (?, ?)";
          const linkValues = [req.body.COURSE_ATND_ID, movedFilePath];
          // console.log(
          //   "Attempting to insert into CTA_ATTENDANCE_LINK:",
          //   linkQuery,
          //   linkValues
          // );

          connection.query(
            linkQuery,
            linkValues,
            (linkErr, linkRows, linkFields) => {
              if (linkErr) {
                console.log("Failed to insert attendance link: " + linkErr);
                // console.log("Link insert values:", linkValues);
                // Don't fail the whole operation for link insert failure
              } else {
                console.log(
                  "Successfully inserted attendance link:",
                  linkValues,
                );
              }
              // After link insert, update SYSTEM_IDS
              const updateQuery = `UPDATE SYSTEM_IDS SET CURRENT_ID = '${req.body.COURSE_ATND_ID}' WHERE TABLE_NAME = 'CTA_ATTENDANCE'`;
              connection.query(updateQuery, (err2, rows2, fields2) => {
                if (err2) {
                  console.log(
                    "Failed to query for attendance system id update: " + err2,
                  );
                  res.sendStatus(500);
                  connection.end();
                  return;
                }
                // Build response with moved file path and any file move error
                const responseData = { success: true };
                if (!moveResult.success) {
                  responseData.fileMoveError = moveResult.error;
                  responseData.isFileLocked = moveResult.isFileLocked;
                } else if (movedFilePath) {
                  responseData.movedFilePath = movedFilePath;
                }
                res.json(responseData);
                connection.end();
              });
            },
          );
        } else {
          // If no link, just update SYSTEM_IDS
          const updateQuery = `UPDATE SYSTEM_IDS SET CURRENT_ID = '${req.body.COURSE_ATND_ID}' WHERE TABLE_NAME = 'CTA_ATTENDANCE'`;
          connection.query(updateQuery, (err2, rows2, fields2) => {
            if (err2) {
              console.log(
                "Failed to query for attendance system id update: " + err2,
              );
              res.sendStatus(500);
              connection.end();
              return;
            }
            res.json(rows);
            connection.end();
          });
        }
      });
    });
  } catch (err) {
    console.log("Error connecting to Db (changes 144)");
    return;
  }
});

// ==================================================
// Retry moving a file that was locked
router.post("/retry-move-file", (req, res) => {
  try {
    const linkPath = req.body.linkPath;
    if (!linkPath) {
      return res
        .status(400)
        .json({ success: false, error: "No file path provided" });
    }

    // Attempt to move the file again
    const moveResult = moveCompetencyFile(linkPath);
    const response = { ...moveResult };

    // If successful, calculate and return the moved file path
    if (moveResult.success) {
      const path = require("path");
      const filename = path.basename(linkPath);
      if (linkPath.toLowerCase().startsWith("K:\\")) {
        response.movedFilePath =
          "K:\\Quality - Records\\7200 - Competency\\_entered\\" + filename;
      } else if (linkPath.toLowerCase().startsWith("\\\\")) {
        response.movedFilePath =
          "\\\\fs1\\Common\\Quality - Records\\7200 - Competency\\_entered\\" +
          filename;
      }
    }

    res.json(response);
  } catch (err) {
    console.error("Error in retry-move-file:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==================================================
// Get a single record
module.exports = router;
