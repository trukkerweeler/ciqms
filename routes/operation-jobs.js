const express = require("express");
const path = require("path");
const { execFile } = require("child_process");

const router = express.Router();

function getCscript32() {
  return process.env.SYSTEMROOT
    ? path.join(process.env.SYSTEMROOT, "SysWOW64", "cscript.exe")
    : "C:/Windows/SysWOW64/cscript.exe";
}

function callVBS(vbsPath, args) {
  return new Promise((resolve, reject) => {
    const cscript32 = getCscript32();

    execFile(
      cscript32,
      ["//Nologo", vbsPath, ...args],
      {
        windowsHide: true,
        env: {
          ...process.env,
          CIQMS_GLOBAL_DSN: process.env.GLOBAL_DSN || "",
          CIQMS_GLOBAL_UID: process.env.GLOBAL_UID || "",
          CIQMS_GLOBAL_PWD: process.env.GLOBAL_PWD || "",
        },
      },
      (err, stdout, stderr) => {
        if (err) {
          const details = (stderr || stdout || "").trim();
          reject(new Error(`VBS execution failed: ${details}`));
          return;
        }

        try {
          resolve(JSON.parse((stdout || "").trim()));
        } catch (parseErr) {
          reject(
            new Error(
              `Failed to parse VBS JSON output: ${(stdout || "").substring(0, 500)} [STDERR: ${(stderr || "").substring(0, 200)}]`,
            ),
          );
        }
      },
    );
  });
}

function getMonthWindow(monthInput) {
  const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
  let year;
  let month;

  if (monthInput) {
    if (!monthPattern.test(monthInput)) {
      throw new Error("Invalid month format. Use YYYY-MM.");
    }
    year = Number(monthInput.slice(0, 4));
    month = Number(monthInput.slice(5, 7));
  } else {
    const now = new Date();
    year = now.getFullYear();
    month = now.getMonth();
    if (month === 0) {
      month = 12;
      year -= 1;
    }
  }

  const startDateYY = `${String(year % 100).padStart(2, "0")}${String(month).padStart(2, "0")}01`;
  const nextMonthYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const endDateExclusiveYY = `${String(nextMonthYear % 100).padStart(2, "0")}${String(nextMonth).padStart(2, "0")}01`;
  const startDateYYYY = `${year}${String(month).padStart(2, "0")}01`;
  const endDateExclusiveYYYY = `${nextMonthYear}${String(nextMonth).padStart(2, "0")}01`;

  return {
    month: `${year}-${String(month).padStart(2, "0")}`,
    startDateYY,
    endDateExclusiveYY,
    startDateYYYY,
    endDateExclusiveYYYY,
  };
}

function toIsoDateFromCompact(rawDate) {
  const digits = String(rawDate || "").replace(/\D/g, "");
  if (/^\d{8}$/.test(digits)) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  }
  if (!/^\d{6}$/.test(digits)) return null;
  const yy = Number(digits.slice(0, 2));
  const century = yy >= 80 ? 1900 : 2000;
  return `${century + yy}-${digits.slice(2, 4)}-${digits.slice(4, 6)}`;
}

function toNumberOrZero(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function mapSummaryToSortedArray(summaryMap, keyName) {
  return Array.from(summaryMap.entries())
    .map(([key, value]) => ({ [keyName]: key, ...value }))
    .sort((a, b) => String(a[keyName]).localeCompare(String(b[keyName])));
}

router.get("/weld-operations-report", async (req, res) => {
  const { month: monthInput, sort = "asc" } = req.query;

  if (!["asc", "desc"].includes(String(sort).toLowerCase())) {
    return res.status(400).json({
      error: "Invalid sort. Allowed values: asc, desc",
    });
  }

  let window;
  try {
    window = getMonthWindow(monthInput ? String(monthInput) : "");
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  try {
    const vbsPath = path.join(__dirname, "operation-jobs-weld-ops.vbs");
    let usedDateFormat = "YYMMDD";
    let usedStartDate = window.startDateYY;
    let usedEndDateExclusive = window.endDateExclusiveYY;
    let vbsResult;

    try {
      vbsResult = await callVBS(vbsPath, [
        window.startDateYY,
        window.endDateExclusiveYY,
      ]);
    } catch (primaryErr) {
      const message = String(primaryErr?.message || "");
      if (!message.toUpperCase().includes("TIMEOUT")) {
        throw primaryErr;
      }

      usedDateFormat = "YYYYMMDD";
      usedStartDate = window.startDateYYYY;
      usedEndDateExclusive = window.endDateExclusiveYYYY;
      vbsResult = await callVBS(vbsPath, [
        window.startDateYYYY,
        window.endDateExclusiveYYYY,
      ]);
    }

    if (!vbsResult.success || !Array.isArray(vbsResult.rows)) {
      return res.status(500).json({
        error: "Unexpected VBS payload for weld report",
        details: vbsResult,
      });
    }

    const normalizedRows = vbsResult.rows
      .map((row) => {
        const dateCompletedRaw = String(row.DATE_COMPLETED || "").trim();
        const dateCompletedIso = toIsoDateFromCompact(dateCompletedRaw);
        const unitsOpen = toNumberOrZero(row.UNITS_OPEN);
        const unitsComplete = toNumberOrZero(row.UNITS_COMPLETE);
        const quantity = unitsComplete > 0 ? unitsComplete : unitsOpen;

        return {
          sourceTable: String(row.SOURCE_TABLE || "").trim(),
          job: String(row.JOB || "").trim(),
          suffix: String(row.SUFFIX || "").trim(),
          seq: String(row.SEQ || "").trim(),
          operation: String(row.OPERATION || "").trim(),
          description: String(row.DESCRIPTION || "").trim(),
          dateCompletedRaw,
          dateCompletedIso,
          part: String(row.PART || "").trim(),
          partDescription: String(row.PART_DESCRIPTION || "").trim(),
          customer: String(row.CUSTOMER || "").trim(),
          router: String(row.ROUTER || "").trim(),
          lmo: String(row.LMO || "").trim(),
          unitsOpen,
          unitsComplete,
          quantity,
          unitsScrap: toNumberOrZero(row.UNITS_SCRAP),
        };
      })
      .filter((row) => row.dateCompletedIso);

    const sortDirection = String(sort).toLowerCase();
    normalizedRows.sort((a, b) => {
      const cmpDate = a.dateCompletedIso.localeCompare(b.dateCompletedIso);
      if (cmpDate !== 0) return sortDirection === "desc" ? -cmpDate : cmpDate;

      const cmpJob = a.job.localeCompare(b.job);
      if (cmpJob !== 0) return cmpJob;

      const cmpSuffix = a.suffix.localeCompare(b.suffix);
      if (cmpSuffix !== 0) return cmpSuffix;

      return a.seq.localeCompare(b.seq);
    });

    const byDay = new Map();
    const byOperation = new Map();
    const byPart = new Map();
    const byJob = new Map();
    const byCustomer = new Map();
    const operationCodes = new Set();

    for (const row of normalizedRows) {
      operationCodes.add(row.operation);

      const dayKey = row.dateCompletedIso;
      if (!byDay.has(dayKey)) {
        byDay.set(dayKey, {
          operationsCompleted: 0,
          unitsComplete: 0,
          unitsScrap: 0,
        });
      }
      byDay.get(dayKey).operationsCompleted += 1;
      byDay.get(dayKey).unitsComplete += row.unitsComplete;
      byDay.get(dayKey).unitsScrap += row.unitsScrap;

      const opKey = row.operation || "(blank)";
      if (!byOperation.has(opKey)) {
        byOperation.set(opKey, {
          operationsCompleted: 0,
          unitsComplete: 0,
          unitsScrap: 0,
        });
      }
      byOperation.get(opKey).operationsCompleted += 1;
      byOperation.get(opKey).unitsComplete += row.unitsComplete;
      byOperation.get(opKey).unitsScrap += row.unitsScrap;

      const partKey = row.part || "(blank)";
      if (!byPart.has(partKey)) {
        byPart.set(partKey, {
          operationsCompleted: 0,
          unitsComplete: 0,
          unitsScrap: 0,
        });
      }
      byPart.get(partKey).operationsCompleted += 1;
      byPart.get(partKey).unitsComplete += row.unitsComplete;
      byPart.get(partKey).unitsScrap += row.unitsScrap;

      const jobKey = `${row.job}-${row.suffix}`;
      if (!byJob.has(jobKey)) {
        byJob.set(jobKey, {
          operationsCompleted: 0,
          unitsComplete: 0,
          unitsScrap: 0,
        });
      }
      byJob.get(jobKey).operationsCompleted += 1;
      byJob.get(jobKey).unitsComplete += row.unitsComplete;
      byJob.get(jobKey).unitsScrap += row.unitsScrap;

      const customerKey = row.customer || "(blank)";
      if (!byCustomer.has(customerKey)) {
        byCustomer.set(customerKey, {
          operationsCompleted: 0,
          unitsComplete: 0,
          unitsScrap: 0,
        });
      }
      byCustomer.get(customerKey).operationsCompleted += 1;
      byCustomer.get(customerKey).unitsComplete += row.unitsComplete;
      byCustomer.get(customerKey).unitsScrap += row.unitsScrap;
    }

    res.json({
      success: true,
      criteria: {
        month: window.month,
        startDateInclusive: usedStartDate,
        endDateExclusive: usedEndDateExclusive,
        dateField: "DATE_COMPLETED",
        dateFormat: usedDateFormat,
        operationIn: ["SPOTW", "FUSION"],
        sort: sortDirection,
        includeTables: ["JOB_OPERATIONS", "JOB_HIST_OPS"],
      },
      rowCount: normalizedRows.length,
      operationCodes: Array.from(operationCodes).sort((a, b) =>
        a.localeCompare(b),
      ),
      rows: normalizedRows,
      summaries: {
        byDay: mapSummaryToSortedArray(byDay, "day"),
        byOperation: mapSummaryToSortedArray(byOperation, "operation"),
        byPart: mapSummaryToSortedArray(byPart, "part"),
        byJob: mapSummaryToSortedArray(byJob, "jobSuffix"),
        byCustomer: mapSummaryToSortedArray(byCustomer, "customer"),
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error(
      "[operation-jobs/weld-operations-report] Error:",
      err.message,
    );
    res.status(500).json({
      error: "Failed to build weld operations report",
      details: err.message,
    });
  }
});

module.exports = router;
