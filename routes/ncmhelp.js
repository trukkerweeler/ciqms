const express = require("express");
const mysql = require("mysql2");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

const inputFilesPath =
  process.env.INPUT_FILES_PATH ||
  String.raw`\\fs1\Common\Quality\00000_Work Instructions`;

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync(inputFilesPath)) {
      fs.mkdirSync(inputFilesPath, { recursive: true });
    }
    cb(null, inputFilesPath);
  },
  filename: function (req, file, cb) {
    let filename = file.originalname;
    let filepath = path.join(inputFilesPath, filename);

    if (fs.existsSync(filepath)) {
      const ext = path.extname(filename);
      const base = path.basename(filename, ext);
      filename = `${base}_${Date.now()}${ext}`;
    }

    cb(null, filename);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
});

function createConnection() {
  return mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    port: 3306,
    database: "quality",
  });
}

router.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  res.json({
    success: true,
    filename: req.file.filename,
    originalname: req.file.originalname,
    path: `/input-files/${req.file.filename}`,
    size: req.file.size,
  });
});

router.get("/", (req, res) => {
  const connection = createConnection();
  connection.connect((connectError) => {
    if (connectError) {
      console.error("Error connecting to NCM help database:", connectError);
      return res.status(500).json({ error: "Database connection failed" });
    }

    connection.query(
      "SELECT SUBJECT, DESCRIPTION, LINK FROM NCM_HELP ORDER BY SUBJECT ASC",
      (queryError, rows) => {
        connection.end();
        if (queryError) {
          console.error("Failed to query NCM help:", queryError);
          return res.status(500).json({ error: "Failed to query NCM help" });
        }
        res.json(rows);
      },
    );
  });
});

router.post("/", (req, res) => {
  const { SUBJECT, DESCRIPTION, LINK } = req.body;
  if (!SUBJECT || !DESCRIPTION) {
    return res
      .status(400)
      .json({ error: "SUBJECT and DESCRIPTION are required" });
  }

  const connection = createConnection();
  connection.connect((connectError) => {
    if (connectError) {
      console.error("Error connecting to NCM help database:", connectError);
      return res.status(500).json({ error: "Database connection failed" });
    }

    connection.query(
      "INSERT INTO NCM_HELP (SUBJECT, DESCRIPTION, LINK) VALUES (?, ?, ?)",
      [SUBJECT.trim(), DESCRIPTION.trim(), LINK?.trim() || null],
      (queryError) => {
        connection.end();
        if (queryError) {
          console.error("Failed to insert NCM help:", queryError);
          return res.status(500).json({ error: "Failed to save NCM help" });
        }
        res.json({ success: true });
      },
    );
  });
});

module.exports = router;
