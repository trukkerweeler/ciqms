const express = require("express");
const router = express.Router();
const mysql = require("mysql2");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// ==================================================
// Filing-location helpers
// ==================================================

function normalizeFilingLocationPath(location = "") {
  const trimmedLocation = String(location || "").trim();
  if (!trimmedLocation) return "";
  if (trimmedLocation.startsWith("\\\\fs1\\Quality - Records")) {
    return trimmedLocation.replace(
      "\\\\fs1\\Quality - Records",
      "\\\\fs1\\Common\\Quality - Records",
    );
  }
  return trimmedLocation;
}

function readFilingLocations() {
  const filePath = path.join(__dirname, "..", "data", "filing-locations.json");
  if (!fs.existsSync(filePath)) return {};
  try {
    const rawLocations = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return Object.fromEntries(
      Object.entries(rawLocations || {}).map(([code, location]) => [
        code,
        normalizeFilingLocationPath(location),
      ]),
    );
  } catch (error) {
    console.error("Unable to read filing locations file", error.message);
    return {};
  }
}

function getFilingLocation(subject = "") {
  if (!subject) return "";
  const normalizedSubject = String(subject).trim().toUpperCase();
  const locations = readFilingLocations();
  return locations[normalizedSubject] || "";
}

// ==================================================
// Date/timestamp helpers
// ==================================================

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatResponseTimestamp(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} ${ampm}`;
}

function parseDateFromFilename(fileName, fallbackTimestamp = "") {
  const normalizedName = (fileName || "").toString().toUpperCase();
  const dateCandidates = [];

  const prefixRemoved = normalizedName
    .replace(/^(SKM|SKN|SCAN|SCANNER)[^A-Z0-9]*/i, "")
    .replace(/^C\d{3}/, "");
  const cleanedName = prefixRemoved.replace(/[^A-Z0-9]/g, "");

  const nameWithoutExtension = normalizedName.replace(/\.[A-Z0-9]+$/, "");
  const afterFirstEight = nameWithoutExtension.slice(8);
  const yyMMddMatch = afterFirstEight.match(/(\d{6})/);
  if (yyMMddMatch) {
    const digits = yyMMddMatch[1];
    const yearCandidate = Number(`20${digits.slice(0, 2)}`);
    const monthCandidate = Number(digits.slice(2, 4));
    const dayCandidate = Number(digits.slice(4, 6));
    if (
      yearCandidate >= 1900 &&
      yearCandidate <= 2099 &&
      monthCandidate >= 1 &&
      monthCandidate <= 12 &&
      dayCandidate >= 1 &&
      dayCandidate <= 31
    ) {
      dateCandidates.push({
        year: yearCandidate,
        month: monthCandidate,
        day: dayCandidate,
        dateString: `${yearCandidate}-${String(monthCandidate).padStart(2, "0")}-${String(dayCandidate).padStart(2, "0")}`,
      });
    }
  }

  const compactDateMatch = cleanedName.match(/(\d{8})(\d{4})?/);
  if (compactDateMatch) {
    const digits = compactDateMatch[1];
    const firstFour = Number(digits.slice(0, 4));
    const monthCandidate = Number(digits.slice(4, 6));
    const dayCandidate = Number(digits.slice(6, 8));
    if (
      firstFour >= 1900 &&
      firstFour <= 2099 &&
      monthCandidate >= 1 &&
      monthCandidate <= 12 &&
      dayCandidate >= 1 &&
      dayCandidate <= 31
    ) {
      dateCandidates.push({
        year: firstFour,
        month: monthCandidate,
        day: dayCandidate,
        dateString: `${firstFour}-${String(monthCandidate).padStart(2, "0")}-${String(dayCandidate).padStart(2, "0")}`,
      });
    }

    const yyYear = Number(`20${digits.slice(0, 2)}`);
    const yyMonth = Number(digits.slice(2, 4));
    const yyDay = Number(digits.slice(4, 6));
    if (
      yyYear >= 1900 &&
      yyYear <= 2099 &&
      yyMonth >= 1 &&
      yyMonth <= 12 &&
      yyDay >= 1 &&
      yyDay <= 31
    ) {
      dateCandidates.push({
        year: yyYear,
        month: yyMonth,
        day: yyDay,
        dateString: `${yyYear}-${String(yyMonth).padStart(2, "0")}-${String(yyDay).padStart(2, "0")}`,
      });
    }
  }

  const dashedMatch = normalizedName.match(/(\d{4})[-_.]?(\d{2})[-_.]?(\d{2})/);
  if (dashedMatch) {
    const year = Number(dashedMatch[1]);
    const month = Number(dashedMatch[2]);
    const day = Number(dashedMatch[3]);
    if (
      year >= 1900 &&
      year <= 2099 &&
      month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= 31
    ) {
      dateCandidates.push({
        year,
        month,
        day,
        dateString: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      });
    }
  }

  const eightDigitMatch = normalizedName.match(/(\d{8})/);
  if (eightDigitMatch) {
    const digits = eightDigitMatch[1];
    const firstFour = Number(digits.slice(0, 4));
    const monthCandidate = Number(digits.slice(4, 6));
    const dayCandidate = Number(digits.slice(6, 8));
    if (
      firstFour >= 1900 &&
      firstFour <= 2099 &&
      monthCandidate >= 1 &&
      monthCandidate <= 12 &&
      dayCandidate >= 1 &&
      dayCandidate <= 31
    ) {
      dateCandidates.push({
        year: firstFour,
        month: monthCandidate,
        day: dayCandidate,
        dateString: `${firstFour}-${String(monthCandidate).padStart(2, "0")}-${String(dayCandidate).padStart(2, "0")}`,
      });
    }

    const yyYear = Number(`20${digits.slice(0, 2)}`);
    const yyMonth = Number(digits.slice(2, 4));
    const yyDay = Number(digits.slice(4, 6));
    if (
      yyYear >= 1900 &&
      yyYear <= 2099 &&
      yyMonth >= 1 &&
      yyMonth <= 12 &&
      yyDay >= 1 &&
      yyDay <= 31
    ) {
      dateCandidates.push({
        year: yyYear,
        month: yyMonth,
        day: yyDay,
        dateString: `${yyYear}-${String(yyMonth).padStart(2, "0")}-${String(yyDay).padStart(2, "0")}`,
      });
    }
  }

  if (dateCandidates.length > 0) return dateCandidates[0];

  const fallbackDate = new Date(fallbackTimestamp || "");
  if (!Number.isNaN(fallbackDate.getTime())) {
    const fallbackYear = fallbackDate.getFullYear();
    const fallbackMonth = fallbackDate.getMonth() + 1;
    const fallbackDay = fallbackDate.getDate();
    return {
      year: fallbackYear,
      month: fallbackMonth,
      day: fallbackDay,
      dateString: `${fallbackYear}-${String(fallbackMonth).padStart(2, "0")}-${String(fallbackDay).padStart(2, "0")}`,
    };
  }

  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
    dateString: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`,
  };
}

// ==================================================
// File-copy helpers (source is NEVER deleted)
// ==================================================

function normalizeWindowsPath(filePath = "") {
  if (!filePath) return "";
  const normalizedPath = String(filePath).replace(/\//g, "\\").trim();
  if (!normalizedPath) return "";
  if (normalizedPath.startsWith("\\\\")) return normalizedPath;

  const driveMatch = normalizedPath.match(/^([A-Za-z]):\\/);
  if (!driveMatch) return normalizedPath;

  const driveLetter = driveMatch[1].toUpperCase();
  const pathAfterDrive = normalizedPath.slice(3).replace(/^\\+/, "");

  if (
    driveLetter === "K" &&
    pathAfterDrive.toLowerCase().startsWith("quality - records")
  ) {
    return path.win32.join("\\\\fs1\\Common", pathAfterDrive);
  }

  try {
    const output = execSync("net use", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const mappingLine = output
      .split(/\r?\n/)
      .find(
        (line) => line.includes(`${driveLetter}:`) && line.includes("\\\\"),
      );
    if (!mappingLine) return normalizedPath;
    const uncMatch = mappingLine.match(/([A-Za-z]:)\s+(\\\\[^\s]+)/);
    if (!uncMatch) return normalizedPath;
    return path.win32.join(uncMatch[2], pathAfterDrive);
  } catch {
    return normalizedPath;
  }
}

function toMappedDrivePath(destinationPath = "") {
  const normalizedPath = String(destinationPath || "").trim();
  if (!normalizedPath) return "";
  const commonShareMatch = normalizedPath.match(/^\\\\fs1\\Common\\(.*)$/i);
  if (!commonShareMatch) return normalizedPath;
  const suffix = commonShareMatch[1].replace(/^\\+/, "");
  if (!suffix) return normalizedPath;
  return `K:\\${suffix}`;
}

// Copy source to destination; source is deleted only after a verified copy.
function copyFileToDestination(sourcePath = "", destinationPath = "") {
  if (!sourcePath || !destinationPath) {
    return {
      copiedFile: false,
      targetPath: "",
      error: "Missing source or destination path",
    };
  }

  const normalizedSourcePath = normalizeWindowsPath(sourcePath);
  const normalizedDestinationPath = normalizeWindowsPath(destinationPath);
  const mappedDestinationPath = toMappedDrivePath(normalizedDestinationPath);

  if (!normalizedSourcePath || !normalizedDestinationPath) {
    return { copiedFile: false, targetPath: "", error: "Invalid file path" };
  }

  if (!fs.existsSync(normalizedSourcePath)) {
    return {
      copiedFile: false,
      targetPath: "",
      error: "Source file does not exist",
    };
  }

  const basePath = path.extname(normalizedDestinationPath)
    ? normalizedDestinationPath
    : path.win32.join(
        mappedDestinationPath || normalizedDestinationPath,
        path.win32.basename(normalizedSourcePath),
      );
  const targetDir = path.win32.dirname(basePath);

  try {
    fs.mkdirSync(targetDir, { recursive: true });

    if (path.resolve(normalizedSourcePath) === path.resolve(basePath)) {
      return {
        copiedFile: false,
        targetPath: basePath,
        error: "Destination matches the source path",
      };
    }

    // Find a non-colliding name rather than overwriting anything
    let finalTargetPath = basePath;
    if (fs.existsSync(basePath)) {
      const parsed = path.parse(basePath);
      let i = 1;
      do {
        finalTargetPath = path.win32.join(
          targetDir,
          `${parsed.name} (${i})${parsed.ext}`,
        );
        i += 1;
      } while (fs.existsSync(finalTargetPath));
    }

    fs.copyFileSync(normalizedSourcePath, finalTargetPath);

    if (!fs.existsSync(finalTargetPath)) {
      return {
        copiedFile: false,
        targetPath: "",
        error: "Destination file was not created after copy",
      };
    }

    return { copiedFile: true, targetPath: finalTargetPath, error: "" };
  } catch (err) {
    return { copiedFile: false, targetPath: "", error: err.message };
  }
}

// ==================================================
// GET /qrscan — list queue entries with matched input records
// ==================================================
router.get("/", (req, res) => {
  try {
    const scanFilePath =
      process.env.QR_SCAN_FILE_PATH ||
      "C:\\Users\\TimK\\Desktop\\TKSCANS\\qr_scan.jsonl";

    if (!fs.existsSync(scanFilePath)) {
      res
        .status(404)
        .json({ error: "QR scan file not found", path: scanFilePath });
      return;
    }

    const rawContent = fs.readFileSync(scanFilePath, "utf8");
    const entries = rawContent
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

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
          "Error connecting to database for QR scan lookup: " + err.stack,
        );
        res.status(500).json({ error: "Database connection failed" });
        return;
      }

      if (entries.length === 0) {
        res.json([]);
        connection.end();
        return;
      }

      const results = [];
      let completed = 0;

      entries.forEach((entry, index) => {
        const qrCode = (entry.qrData || "").toString().trim();
        const sourceName = entry.originalFile || entry.pdfPath || "";
        const dateInfo = parseDateFromFilename(sourceName, entry.timestamp);

        const query = `SELECT INPUT_ID, INPUT_DATE, SUBJECT FROM PEOPLE_INPUT WHERE SUBJECT LIKE ? AND DATE(INPUT_DATE) < ? ORDER BY INPUT_DATE DESC LIMIT 1`;

        connection.query(
          query,
          [`%${qrCode}%`, dateInfo.dateString],
          (queryErr, rows) => {
            if (queryErr) {
              console.error(
                `Failed to query QR scan match for ${qrCode}: ${queryErr.message}`,
              );
            }

            const match = rows && rows[0] ? rows[0] : null;
            const subject = match ? match.SUBJECT : null;
            const pdfPath = entry.pdfPath || "";
            results[index] = {
              ...entry,
              sourceName,
              month: dateInfo.month,
              year: dateInfo.year,
              monthLabel: `${dateInfo.year}-${String(dateInfo.month).padStart(2, "0")}`,
              inputId: match ? match.INPUT_ID : null,
              inputDate: match ? match.INPUT_DATE : null,
              subject,
              pdfMissing: pdfPath ? !fs.existsSync(pdfPath) : false,
              destinationPath: getFilingLocation(subject || ""),
              pdfViewerUrl: `/qrscan/view?file=${encodeURIComponent(pdfPath)}`,
            };

            completed += 1;
            if (completed === entries.length) {
              res.json(results);
              connection.end();
            }
          },
        );
      });
    });
  } catch (error) {
    console.error("Error in QR scan endpoint:", error);
    res.status(500).json({ error: "Failed to process QR scan file" });
  }
});

// ==================================================
// DELETE /qrscan/missing — remove entries whose PDF no longer exists
// ==================================================
router.delete("/missing", (req, res) => {
  try {
    const scanFilePath =
      process.env.QR_SCAN_FILE_PATH ||
      "C:\\Users\\TimK\\Desktop\\TKSCANS\\qr_scan.jsonl";

    if (!fs.existsSync(scanFilePath)) {
      res.json({ removed: 0, removedFiles: [] });
      return;
    }

    const rawContent = fs.readFileSync(scanFilePath, "utf8");
    const lines = rawContent
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    const removedFiles = [];
    const kept = lines.filter((entry) => {
      const pdfPath = entry.pdfPath || "";
      if (pdfPath && !fs.existsSync(pdfPath)) {
        removedFiles.push(entry.originalFile || pdfPath);
        return false;
      }
      return true;
    });

    fs.writeFileSync(
      scanFilePath,
      kept.map((e) => JSON.stringify(e)).join("\n") + (kept.length ? "\n" : ""),
    );

    res.json({ removed: removedFiles.length, removedFiles });
  } catch (error) {
    console.error("Error purging missing QR scan entries:", error);
    res.status(500).json({ error: "Failed to purge missing entries" });
  }
});

// ==================================================
// POST /qrscan/process — save disposition, close input, copy file
// ==================================================
router.post("/process", (req, res) => {
  try {
    const payload = req.body || {};
    const inputId = payload.inputId;
    const selectedOption = payload.selectedOption;
    const modifiedBy = payload.MODIFIED_BY || payload.user || "SYSTEM";
    const destinationPath = payload.destinationPath || "";
    const sourcePath = payload.pdfPath || payload.sourcePath || "";
    const sourceName =
      payload.originalFile || payload.sourceName || payload.pdfPath || "";

    // Build QMS filename: SUBJECT_YYYY-MM-DD_INPUTID.pdf
    const subjectCode = (payload.subject || payload.qrData || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
    const dateStr = String(payload.inputDate || "").slice(0, 10);
    const idStr = String(inputId || "").padStart(7, "0");
    const qmsFileName =
      subjectCode && dateStr && idStr
        ? `${subjectCode}_${dateStr}_${idStr}.pdf`
        : path.basename(sourcePath || "scan.pdf");
    const filedDestinationPath = destinationPath
      ? path.win32.join(destinationPath, qmsFileName)
      : "";

    if (!inputId || !selectedOption) {
      res
        .status(400)
        .json({ error: "inputId and selectedOption are required" });
      return;
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
        console.error(
          "Error connecting to database for QR scan process: " + err.stack,
        );
        res.status(500).json({ error: "Database connection failed" });
        return;
      }

      const closedDate = getLocalDateString();
      const timestamp = formatResponseTimestamp(new Date());
      const prefixedResponse = `TKENT - ${timestamp}\n${String(selectedOption).trim()}`;

      const responseQuery = `
        INSERT INTO PPL_INPT_RSPN (INPUT_ID, RESPONSE_TEXT)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE RESPONSE_TEXT = VALUES(RESPONSE_TEXT)
      `;

      connection.query(
        responseQuery,
        [String(inputId), prefixedResponse],
        (responseErr) => {
          if (responseErr) {
            console.error(
              "Failed to save QR scan response:",
              responseErr.message,
            );
            connection.end();
            res.status(500).json({ error: "Failed to save response" });
            return;
          }

          const updateQuery = `UPDATE PEOPLE_INPUT SET CLOSED = 'Y', CLOSED_DATE = ?, MODIFIED_BY = ?, MODIFIED_DATE = ? WHERE INPUT_ID = ?`;

          connection.query(
            updateQuery,
            [closedDate, modifiedBy, closedDate, inputId],
            (updateErr) => {
              if (updateErr) {
                console.error(
                  "Failed to close QR scan input:",
                  updateErr.message,
                );
                connection.end();
                res.status(500).json({ error: "Failed to close input" });
                return;
              }

              const scanFilePath =
                process.env.QR_SCAN_FILE_PATH ||
                "C:\\Users\\TimK\\Desktop\\TKSCANS\\qr_scan.jsonl";

              let copiedFile = false;
              let resolvedDestinationPath = "";
              let fileCopyError = "";
              let removedFromJsonl = false;

              try {
                const copyResult = copyFileToDestination(
                  sourcePath,
                  filedDestinationPath || destinationPath,
                );
                copiedFile = Boolean(copyResult.copiedFile);
                resolvedDestinationPath = copyResult.targetPath || "";
                fileCopyError = copyResult.error || "";

                // Only remove the queue entry once the copy succeeds
                if (copiedFile && fs.existsSync(scanFilePath)) {
                  const rawContent = fs.readFileSync(scanFilePath, "utf8");
                  const lines = rawContent
                    .split(/\r?\n/)
                    .filter(Boolean)
                    .map((line) => {
                      try {
                        return JSON.parse(line);
                      } catch {
                        return null;
                      }
                    })
                    .filter(Boolean);

                  const filteredLines = lines.filter((entry) => {
                    const entrySourceName =
                      entry.originalFile ||
                      entry.sourceName ||
                      entry.pdfPath ||
                      "";
                    const entryPdfPath = entry.pdfPath || "";
                    const matches =
                      (entrySourceName && entrySourceName === sourceName) ||
                      (entryPdfPath && entryPdfPath === sourcePath) ||
                      (entry.qrData && entry.qrData === payload.qrData);
                    if (matches) removedFromJsonl = true;
                    return !matches;
                  });

                  fs.writeFileSync(
                    scanFilePath,
                    filteredLines.map((e) => JSON.stringify(e)).join("\n") +
                      (filteredLines.length ? "\n" : ""),
                  );

                  // Delete source only after copy is confirmed and queue entry removed
                  if (
                    removedFromJsonl &&
                    sourcePath &&
                    resolvedDestinationPath
                  ) {
                    const normalizedSource = normalizeWindowsPath(sourcePath);
                    const normalizedDest = normalizeWindowsPath(
                      resolvedDestinationPath,
                    );
                    const sourceResolved = path.resolve(normalizedSource);
                    const destResolved = path.resolve(normalizedDest);
                    if (
                      sourceResolved !== destResolved &&
                      fs.existsSync(normalizedDest) &&
                      fs.existsSync(normalizedSource)
                    ) {
                      try {
                        fs.unlinkSync(normalizedSource);
                      } catch (delErr) {
                        console.error(
                          "Failed to delete source after copy:",
                          delErr.message,
                        );
                      }
                    }
                  }
                }
              } catch (fileErr) {
                console.error(
                  "Failed to update QR scan file state:",
                  fileErr.message,
                );
              }

              connection.end();
              res.json({
                success: true,
                copiedFile,
                removedFromJsonl,
                fileCopyError,
                inputId,
                selectedOption,
                destinationPath: destinationPath || "",
                resolvedDestinationPath,
              });
            },
          );
        },
      );
    });
  } catch (error) {
    console.error("Error processing QR scan save:", error);
    res.status(500).json({ error: "Failed to process QR scan save" });
  }
});

// ==================================================
// GET /qrscan/view — serve PDF from disk
// ==================================================
router.get("/view", (req, res) => {
  try {
    const requestedFile = req.query.file;
    if (!requestedFile) {
      res.status(400).send("Missing file parameter");
      return;
    }

    const filePath = decodeURIComponent(requestedFile);
    if (!fs.existsSync(filePath)) {
      res.status(404).send("PDF file not found");
      return;
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${path.basename(filePath)}"`,
    );

    const stream = fs.createReadStream(filePath);
    stream.on("error", () => {
      if (!res.headersSent) res.status(500).send("Unable to read PDF file");
    });
    stream.pipe(res);
  } catch (error) {
    console.error("Error serving QR scan PDF:", error);
    res.status(500).send("Unable to serve PDF");
  }
});

module.exports = router;
