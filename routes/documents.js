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

module.exports = router;
