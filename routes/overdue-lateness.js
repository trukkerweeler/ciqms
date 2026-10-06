const express = require("express");
const path = require("path");
const { spawn } = require("child_process");

const router = express.Router();

function parseAsOfDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseGlobalDate(value) {
  const text = String(value || "").trim();
  if (!text || /^0+$/.test(text)) return null;

  let year;
  let month;
  let day;
  let match = text.match(/^(\d{4})[-/]?(\d{2})[-/]?(\d{2})/);
  if (match) {
    [, year, month, day] = match;
  } else {
    match = text.match(/^(\d{2})[-/]?(\d{2})[-/]?(\d{2})$/);
    if (!match) return null;
    [, month, day, year] = match;
    year = Number(year) >= 70 ? `19${year}` : `20${year}`;
  }

  const date = new Date(`${year}-${month}-${day}T00:00:00`);
  if (Number.isNaN(date.getTime()) || date.getFullYear() <= 1900) return null;
  return date;
}

function formatIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function runGlobalQuery() {
  return new Promise((resolve, reject) => {
    const vbsPath = path.join(__dirname, "overdue-lateness.vbs");
    const cscriptPath = path.join(
      process.env.SYSTEMROOT || "C:\\Windows",
      "SysWOW64",
      "cscript.exe",
    );
    const child = spawn(cscriptPath, ["//Nologo", vbsPath]);
    let output = "";
    let errorOutput = "";

    child.stdout.on("data", (data) => {
      output += data.toString();
    });
    child.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });
    child.on("error", (error) => {
      reject(new Error(`Failed to start Global query: ${error.message}`));
    });
    child.on("close", (code) => {
      const sanitized = output
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
        .trim();
      if (code !== 0 || !sanitized) {
        reject(
          new Error(
            `Global query failed (code ${code}): ${
              errorOutput.trim() || "No output"
            }`,
          ),
        );
        return;
      }

      try {
        const data = JSON.parse(sanitized);
        if (data.error) reject(new Error(data.error));
        else resolve(Array.isArray(data) ? data : []);
      } catch (error) {
        reject(new Error(`Invalid Global query response: ${error.message}`));
      }
    });
  });
}

router.get("/", async (req, res) => {
  const asOfDate = parseAsOfDate(
    String(req.query.asOfDate || formatIsoDate(new Date())),
  );
  if (!asOfDate) {
    return res
      .status(400)
      .json({ error: "asOfDate must use YYYY-MM-DD format" });
  }

  try {
    const rows = await runGlobalQuery();
    const jobs = rows
      .map((row) => {
        const part = String(row.PART || "").trim();
        if (["INDIRECT", "INDIRECT ENGINEER"].includes(part.toUpperCase())) {
          return null;
        }

        const dueDate = parseGlobalDate(row.DATE_DUE);
        const qtyOrder = Number.parseFloat(row.QTY_ORDER) || 0;
        const qtyCompleted = Number.parseFloat(row.QTY_COMPLETED) || 0;
        const remainingQty = Math.max(0, qtyOrder - qtyCompleted);
        const closedDate = parseGlobalDate(row.DATE_CLOSED);

        if (
          !dueDate ||
          (closedDate && closedDate <= asOfDate) ||
          (remainingQty <= 0 && (!closedDate || closedDate <= asOfDate))
        ) {
          return null;
        }

        const latenessDays = Math.floor(
          (asOfDate.getTime() - dueDate.getTime()) / 86400000,
        );
        return {
          job: String(row.JOB || "").trim(),
          suffix: String(row.SUFFIX || "").trim(),
          part,
          customer: String(row.CUSTOMER || "").trim(),
          salesOrder: String(row.SALES_ORDER || "").trim(),
          salesOrderLine: String(row.SALES_ORDER_LINE || "").trim(),
          qtyOrder,
          qtyCompleted,
          remainingQty,
          dateOpened: formatIsoDate(parseGlobalDate(row.DATE_OPENED) || dueDate),
          dueDate: formatIsoDate(dueDate),
          daysOverdue: latenessDays,
          daysUntilDue: Math.max(0, -latenessDays),
          status: latenessDays > 0 ? "Overdue" : "Open",
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.daysOverdue - a.daysOverdue || a.dueDate.localeCompare(b.dueDate));

    const overdueJobs = jobs.filter((job) => job.daysOverdue > 0);
    res.json({
      asOfDate: formatIsoDate(asOfDate),
      summary: {
        openJobs: jobs.length,
        overdueJobs: overdueJobs.length,
        averageOverdueDays:
          overdueJobs.length > 0
            ? Number(
                (
                  overdueJobs.reduce((sum, job) => sum + job.daysOverdue, 0) /
                  overdueJobs.length
                ).toFixed(1),
              )
            : 0,
        oldestDaysOverdue: Math.max(0, jobs[0]?.daysOverdue || 0),
      },
      jobs,
    });
  } catch (error) {
    console.error("[overdue-lateness]", error);
    res.status(500).json({ error: "Unable to load overdue job report" });
  }
});

module.exports = router;
