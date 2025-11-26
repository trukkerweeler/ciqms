// Basic /docsavail endpoint to prevent 404 and allow frontend integration
router.post("/docsavail", (req, res) => {
  console.log("/docsavail called with:", req.body);
  // Echo back received data for now
  res.json({ status: "ok", received: req.body });
});
// Document Upload and Conversion Route for CIQMS
// Add this to your routes/ directory

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");
const mysql = require("mysql2");
const nodemailer = require("nodemailer");
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, "../uploads/documents");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Allow only Word documents
    if (
      file.mimetype ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.mimetype === "application/msword" ||
      path.extname(file.originalname).toLowerCase() === ".docx" ||
      path.extname(file.originalname).toLowerCase() === ".doc"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only Word documents (.doc, .docx) are allowed!"), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Upload and convert Word document to HTML
router.post("/upload-convert", upload.single("document"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const inputPath = req.file.path;
  const outputPath = inputPath.replace(/\.(docx?|doc)$/i, ".html");
  const converterScript = path.join(__dirname, "../word_to_html_converter.py");

  // Convert using Python script
  const command = `python "${converterScript}" "${inputPath}" -o "${outputPath}"`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Conversion error: ${error}`);
      return res.status(500).json({
        error: "Document conversion failed",
        details: error.message,
      });
    }

    if (stderr) {
      console.warn(`Conversion warning: ${stderr}`);
    }

    // Read the converted HTML
    fs.readFile(outputPath, "utf8", (err, htmlContent) => {
      if (err) {
        return res.status(500).json({
          error: "Failed to read converted HTML",
          details: err.message,
        });
      }

      res.json({
        success: true,
        message: "Document converted successfully",
        originalFile: req.file.originalname,
        htmlContent: htmlContent,
        downloadUrl: `/documents/download/${path.basename(outputPath)}`,
      });
    });
  });
});

// Serve converted HTML files
router.get("/download/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, "../uploads/documents", filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found" });
  }

  res.download(filePath);
});

// View converted HTML inline
router.get("/view/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, "../uploads/documents", filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("File not found");
  }

  res.sendFile(filePath);
});

// List uploaded documents
router.get("/list", (req, res) => {
  const uploadsDir = path.join(__dirname, "../uploads/documents");

  if (!fs.existsSync(uploadsDir)) {
    return res.json({ documents: [] });
  }

  fs.readdir(uploadsDir, (err, files) => {
    if (err) {
      return res.status(500).json({ error: "Failed to list documents" });
    }

    const documents = files
      .filter(
        (file) =>
          file.endsWith(".html") ||
          file.endsWith(".docx") ||
          file.endsWith(".doc")
      )
      .map((file) => {
        const filePath = path.join(uploadsDir, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          size: stats.size,
          uploadDate: stats.birthtime,
          type: path.extname(file).toLowerCase(),
        };
      });

    res.json({ documents });
  });
});

// ==================================================
// Document Release Notifications
router.post("/release-notifications", async (req, res) => {
  try {
    const now = new Date();
    const weekday = now.getDay();
    const hour = now.getHours();

    // Check if within business hours (Monday-Friday, 7am-5pm)
    if (weekday === 0 || weekday === 6 || hour < 7 || hour >= 17) {
      return res.json({
        message: "Outside business hours - skipping notifications",
        processed: 0,
      });
    }

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
        res.status(500).json({ error: "Database connection failed" });
        return;
      }

      const query = `SELECT d.DOCUMENT_ID, d.REVISION_LEVEL, d.NAME, d.STATUS 
                     FROM DOCUMENTS d 
                     LEFT JOIN DOCUMENTS_NOTIFY dn ON d.DOCUMENT_ID = dn.DOCUMENT_ID 
                       AND d.REVISION_LEVEL = dn.REVISION_LEVEL 
                     WHERE dn.NOTIFIED_DATE IS NULL`;

      connection.query(query, async (err, documents) => {
        if (err) {
          console.log("Failed to query for document notifications: " + err);
          connection.end();
          res.status(500).json({ error: "Query failed" });
          return;
        }

        let processedCount = 0;

        for (const doc of documents) {
          const { DOCUMENT_ID, REVISION_LEVEL, NAME, STATUS } = doc;

          let notification = "";
          let subject = "";

          if (STATUS === "C") {
            notification = `The following document has been issued/revised. Please review and take appropriate action.\n\nDocument id: ${DOCUMENT_ID}, revision: ${REVISION_LEVEL}`;
            subject = `Document Release Notification: ${DOCUMENT_ID} - ${NAME}`;
          } else if (STATUS === "O") {
            notification = `The following document is obsolete. Please review and take appropriate action.\n\nDocument id: ${DOCUMENT_ID}, revision: ${REVISION_LEVEL}`;
            subject = `Document Obsolescence Notification: ${DOCUMENT_ID} - ${NAME}`;
          } else {
            continue;
          }

          // Send email
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
              to: [process.env.EMAIL_GM, process.env.EMAIL_QM],
              from: process.env.SMTP_FROM,
              subject: subject,
              text: notification,
              bcc: "<tim.kent@ci-aviation.com>",
            };

            await transporter.sendMail(mailOptions);

            // Update DOCUMENTS_NOTIFY table
            const insertQuery = `INSERT INTO DOCUMENTS_NOTIFY (DOCUMENT_ID, REVISION_LEVEL, ACTION, NOTIFIED_DATE) 
                                VALUES (?, ?, ?, NOW())`;
            const insertValues = [DOCUMENT_ID, REVISION_LEVEL, STATUS];

            connection.query(insertQuery, insertValues, (err) => {
              if (err) {
                console.log(
                  `Failed to update DOCUMENTS_NOTIFY for ${DOCUMENT_ID}: ${err}`
                );
              }
            });

            processedCount++;
          } catch (emailError) {
            console.log(
              `Failed to send notification for ${DOCUMENT_ID}: ${emailError}`
            );
          }
        }

        connection.end();
        res.json({
          message: "Document notifications processed",
          processed: processedCount,
          total: documents.length,
        });
      });
    });
  } catch (err) {
    console.log("Error in release-notifications: " + err);
    res.status(500).json({ error: "Processing failed" });
  }
});

module.exports = router;
