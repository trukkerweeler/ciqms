const express = require("express");
const mysql = require("mysql2");
const multer = require("multer");

const router = express.Router();

// ==================================================
// Save image to DB using multer

// Configure multer for handling file uploads
const storage = multer.memoryStorage(); // Store files in memory
const upload = multer({ storage: storage });

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
    });

    connection.end();
  } catch (err) {
    console.error("Error connecting to DB: ", err);
    res.sendStatus(500);
  }
});

router.post("/", upload.single("image"), async (req, res) => {
  try {
    const connection = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      port: 3306,
      database: "calibration",
    });

    // Check if the file is uploaded
    if (!req.file) {
      console.error("No file uploaded");
      res.status(400).send("Image file is required");
      return;
    }

    const toolId = req.body.deviceId; // Assuming TOOL_ID is sent in the request body
    if (!toolId) {
      console.error("Tool ID is null or undefined");
      res.status(400).send("Tool ID is required");
      return;
    }

    const image = req.file.buffer; // Get the image buffer from the uploaded file

    const query = `
      INSERT INTO DEVICE_IMAGES (DEVICE_ID, IMAGEBLOB) 
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE IMAGEBLOB = VALUES(IMAGEBLOB)
    `;

    connection.execute(query, [toolId, image], (err, result) => {
      if (err) {
        console.error("Failed to save image: " + err);
        res.sendStatus(500);
        return;
      }
      res.json({ message: "Image saved successfully", id: result.insertId });
    });

    connection.end();
  } catch (err) {
    console.error("Error connecting to DB: ", err);
    res.sendStatus(500);
  }
});

// ==================================================
// Delete image from DB
router.delete("/:id", async (req, res) => {
  const deviceId = req.params.id;

  try {
    const connection = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      port: 3306,
      database: "calibration",
    });

    const query = `DELETE FROM DEVICE_IMAGES WHERE DEVICE_ID = ?`;

    connection.execute(query, [deviceId], (err, result) => {
      if (err) {
        console.error("Failed to delete image: " + err);
        res.sendStatus(500);
        return;
      }

      if (result.affectedRows > 0) {
        res.json({ message: "Image deleted successfully" });
      } else {
        res.status(404).send("Image not found for device ID: " + deviceId);
      }
    });

    connection.end();
  } catch (err) {
    console.error("Error connecting to DB: ", err);
    res.sendStatus(500);
  }
});
// ==================================================

module.exports = router;
