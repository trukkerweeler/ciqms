const basePath =
  process.env.EQUIPMENT_IMAGES_PATH ||
  "\\\\fs1\\Common\\Quality - Records\\7150 - Calibration";
const express = require("express");
const mysql = require("mysql2");
const multer = require("multer");

// Debug mode flag - set to true to enable console logging
const DEBUG_MODE = false;

const router = express.Router();

// ==================================================
// Route to delete image record from EQUIPMENT_IMAGES table
router.delete("/:id", async (req, res) => {
  const equipmentId = req.params.id;
  if (DEBUG_MODE)
    console.log(
      `DELETE /equipmentImage/${equipmentId} - Delete image request received`
    );
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
    // First get the filename for this equipment
    const selectQuery = `SELECT FILENAME FROM EQUIPMENT_IMAGES WHERE EQUIPMENT_ID = ?`;
    connection.execute(selectQuery, [equipmentId], (selectErr, rows) => {
      if (selectErr) {
        console.error("Failed to get image filename: " + selectErr);
        connection.end();
        res.status(500).send("Failed to get image filename");
        return;
      }
      let filename = rows.length > 0 ? rows[0].FILENAME : null;
      if (DEBUG_MODE)
        console.log(`Found filename: ${filename} for equipment ${equipmentId}`);
      // Delete the DB record
      const deleteQuery = `DELETE FROM EQUIPMENT_IMAGES WHERE EQUIPMENT_ID = ?`;
      connection.execute(deleteQuery, [equipmentId], (deleteErr, result) => {
        if (deleteErr) {
          console.error("Failed to delete image record: " + deleteErr);
          connection.end();
          res.status(500).send("Failed to delete image record");
          return;
        }
        if (DEBUG_MODE) {
          console.log(
            `Deleted ${result.affectedRows} rows from EQUIPMENT_IMAGES for equipment ${equipmentId}`
          );
        }
        // Delete the physical file if it exists
        if (filename) {
          const os = require("os");
          const hostname = os.hostname();
          let deleteBasePath;
          if (hostname === "QUALITY-MGR") {
            deleteBasePath = "C:\\Quality - Records\\8511 - Equipment";
          } else {
            deleteBasePath =
              process.env.EQUIPMENT_IMAGES_PATH ||
              "\\\\fs1\\Common\\Quality - Records\\8511 - Equipment";
          }
          const equipmentImagesPath = path.join(
            deleteBasePath,
            "_equipment_images"
          );
          const filePath = path.join(equipmentImagesPath, filename);
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
          console.log(`Image deletion complete for equipment ${equipmentId}`);
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

// Route to get the image filename for equipment
router.get("/filename/:id", async (req, res) => {
  const equipmentId = req.params.id;
  try {
    const connection = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      port: 3306,
      database: "quality",
    });
    const query = `SELECT FILENAME FROM EQUIPMENT_IMAGES WHERE EQUIPMENT_ID = ?`;
    connection.execute(query, [equipmentId], (err, rows) => {
      if (err) {
        console.error("Failed to retrieve image filenames: " + err);
        connection.end();
        res.sendStatus(500);
        return;
      }
      if (rows.length > 0) {
        const filenames = rows.map((row) => row.FILENAME);
        res.json({ filenames: filenames });
      } else {
        res.json({ filenames: [] });
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
  const equipmentId = req.params.id;

  try {
    const connection = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      port: 3306,
      database: "quality",
    });

    const query = `SELECT IMAGEBLOB FROM EQUIPMENT_IMAGES WHERE EQUIPMENT_ID = ?`;

    connection.execute(query, [equipmentId], (err, rows) => {
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
        res
          .status(404)
          .send("Image not found for equipment ID: " + equipmentId);
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

    const equipmentId = req.body.equipmentId;
    if (!equipmentId) {
      console.error("Equipment ID is null or undefined");
      res.status(400).send("Equipment ID is required");
      return;
    }

    // Save the file to the hosted path (_equipment-images subfolder)
    const os = require("os");
    const hostname = os.hostname();
    let basePath;
    if (hostname === "QUALITY-MGR") {
      basePath = "C:\\Quality - Records\\8511 - Equipment";
    } else {
      basePath =
        process.env.EQUIPMENT_IMAGES_PATH ||
        "\\\\fs1\\Common\\Quality - Records\\8511 - Equipment";
    }
    const equipmentImagesPath = path.join(basePath, "_equipment_images");
    if (!fs.existsSync(equipmentImagesPath)) {
      fs.mkdirSync(equipmentImagesPath, { recursive: true });
    }
    const filename = req.file.originalname;
    const destPath = path.join(equipmentImagesPath, filename);
    fs.writeFileSync(destPath, req.file.buffer);

    // Save the filename to EQUIPMENT_IMAGES table
    const query = `
      INSERT INTO EQUIPMENT_IMAGES (EQUIPMENT_ID, FILENAME)
      VALUES (?, ?)
    `;
    connection.execute(query, [equipmentId, filename], (err, result) => {
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
