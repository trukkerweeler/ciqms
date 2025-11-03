const basePath =
  process.env.DEVICE_IMAGES_PATH ||
  "\\\\fs1\\Common\\Quality - Records\\7150 - Calibration";
const express = require("express");
const mysql = require("mysql2");
const multer = require("multer");

// Debug mode flag - set to true to enable console logging
const DEBUG_MODE = false;

const router = express.Router();

// ==================================================
// Route to delete image record from DEVICE_IMAGES table
router.delete("/:id", async (req, res) => {
  const deviceId = req.params.id;
  if (DEBUG_MODE)
    console.log(`DELETE /image/${deviceId} - Delete image request received`);
  try {
    const fs = require("fs");
    const path = require("path");
    const connection = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      port: 3306,
      database: "quality",
    });
    // First get the filename for this device
    const selectQuery = `SELECT FILENAME FROM DEVICE_IMAGES WHERE DEVICE_ID = ?`;
    connection.execute(selectQuery, [deviceId], (selectErr, rows) => {
      if (selectErr) {
        console.error("Failed to get image filename: " + selectErr);
        connection.end();
        res.status(500).send("Failed to get image filename");
        return;
      }
      let filename = rows.length > 0 ? rows[0].FILENAME : null;
      if (DEBUG_MODE)
        console.log(`Found filename: ${filename} for device ${deviceId}`);
      // Delete the DB record
      const deleteQuery = `DELETE FROM DEVICE_IMAGES WHERE DEVICE_ID = ?`;
      connection.execute(deleteQuery, [deviceId], (deleteErr, result) => {
        if (deleteErr) {
          console.error("Failed to delete image record: " + deleteErr);
          connection.end();
          res.status(500).send("Failed to delete image record");
          return;
        }
        if (DEBUG_MODE) {
          console.log(
            `Deleted ${result.affectedRows} rows from DEVICE_IMAGES for device ${deviceId}`
          );
        }
        // Delete the physical file if it exists
        if (filename) {
          const deleteBasePath =
            process.env.DEVICE_IMAGES_PATH ||
            "\\\\fs1\\Common\\Quality - Records\\7150 - Calibration";
          const deviceImagesPath = path.join(deleteBasePath, "_device-images");
          const filePath = path.join(deviceImagesPath, filename);
          if (DEBUG_MODE) console.log(`Attempting to delete file: ${filePath}`);
          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
              if (DEBUG_MODE)
                console.log(`Successfully deleted file: ${filePath}`);
            } catch (fileErr) {
              console.error("Failed to delete image file: " + fileErr);
              // Don't fail the request if file deletion fails
            }
          } else {
            if (DEBUG_MODE) console.log(`File not found: ${filePath}`);
          }
        }
        connection.end();
        if (DEBUG_MODE)
          console.log(`Image deletion complete for device ${deviceId}`);
        res.json({ message: "Image record and file deleted successfully" });
      });
    });
  } catch (err) {
    console.error("Error connecting to DB: ", err);
    res.status(500).send("Error connecting to DB");
  }
});
// Save image to DB using multer

// Configure multer for handling file uploads
const storage = multer.memoryStorage(); // Store files in memory
const upload = multer({ storage: storage });

// Route to get the image filename for a device
router.get("/filename/:id", async (req, res) => {
  const deviceId = req.params.id;
  try {
    const connection = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      port: 3306,
      database: "quality",
    });
    const query = `SELECT FILENAME FROM DEVICE_IMAGES WHERE DEVICE_ID = ?`;
    connection.execute(query, [deviceId], (err, rows) => {
      if (err) {
        console.error("Failed to retrieve image filename: " + err);
        connection.end();
        res.sendStatus(500);
        return;
      }
      if (rows.length > 0 && rows[0].FILENAME) {
        res.json({ filename: rows[0].FILENAME });
      } else {
        res.json({ filename: null });
      }
      connection.end();
    });
  } catch (err) {
    console.error("Error connecting to DB: ", err);
    res.sendStatus(500);
  }
});

// Route to get the binary image data from the database
router.get("/:id", async (req, res) => {
  const deviceId = req.params.id;

  try {
    const connection = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      port: 3306,
      database: "calibration",
    });

    const query = `SELECT IMAGEBLOB FROM DEVICE_IMAGES WHERE DEVICE_ID = ?`;

    connection.execute(query, [deviceId], (err, rows) => {
      if (err) {
        console.error("Failed to retrieve image: " + err);
        connection.end();
        res.sendStatus(500);
        return;
      }

      if (rows.length > 0) {
        const imageBuffer = rows[0].IMAGEBLOB; // Get the image buffer from the first row
        res.setHeader("Content-Type", "image/png");
        res.send(imageBuffer); // Send the image buffer as the response
      } else {
        res.status(404).send("Image not found for device ID: " + deviceId);
      }
      connection.end();
    });
  } catch (err) {
    console.error("Error connecting to DB: ", err);
    res.sendStatus(500);
  }
});

router.post("/", upload.single("image"), async (req, res) => {
  try {
    const fs = require("fs");
    const path = require("path");
    const connection = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      port: 3306,
      database: "quality",
    });

    // Check if the file is uploaded
    if (!req.file) {
      console.error("No file uploaded");
      res.status(400).send("Image file is required");
      return;
    }

    const deviceId = req.body.deviceId;
    if (!deviceId) {
      console.error("Device ID is null or undefined");
      res.status(400).send("Device ID is required");
      return;
    }

    // Save the file to the hosted path (_device-images subfolder)
    const basePath =
      process.env.DEVICE_IMAGES_PATH ||
      "\\\\fs1\\Common\\Quality - Records\\7150 - Calibration";
    const deviceImagesPath = path.join(basePath, "_device-images");
    if (!fs.existsSync(deviceImagesPath)) {
      fs.mkdirSync(deviceImagesPath, { recursive: true });
    }
    const filename = req.file.originalname;
    const destPath = path.join(deviceImagesPath, filename);
    fs.writeFileSync(destPath, req.file.buffer);

    // Save the filename to DEVICE_IMAGES table
    const query = `
      INSERT INTO DEVICE_IMAGES (DEVICE_ID, FILENAME)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE FILENAME = VALUES(FILENAME)
    `;
    connection.execute(query, [deviceId, filename], (err, result) => {
      if (err) {
        console.error("Failed to save image filename: " + err);
        connection.end();
        res.sendStatus(500);
        return;
      }
      res.json({
        message: "Image filename saved successfully",
        id: result.insertId,
      });
      connection.end();
    });
  } catch (err) {
    console.error("Error connecting to DB: ", err);
    res.sendStatus(500);
  }
});
// ==================================================

module.exports = router;
