const express = require("express");
const mysql = require("mysql2");
const path = require("path");
const { spawn } = require("child_process");

const router = express.Router();

function parseIsoDate(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const d = new Date(`${dateStr}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function parseGlobalDate(value) {
  const s = String(value || "").trim();
  if (!s) return null;

  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const d = new Date(`${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}T00:00:00`);
    if (Number.isNaN(d.getTime())) return null;
    // Global uses 1900-01-01 as a placeholder for "no date".
    if (d.getFullYear() <= 1900) return null;
    return d;
  }

  const mdyMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (mdyMatch) {
    const mm = mdyMatch[1].padStart(2, "0");
    const dd = mdyMatch[2].padStart(2, "0");
    const yyyy = mdyMatch[3];
    const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
    if (Number.isNaN(d.getTime())) return null;
    // Global uses 1900-01-01 as a placeholder for "no date".
    if (d.getFullYear() <= 1900) return null;
    return d;
  }

  return null;
}

function fetchAslSuppliers() {
  return new Promise((resolve, reject) => {
    const connection = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      port: 3306,
      database: "quality",
    });

    const query = `
      SELECT SUPPLIER_ID, NAME
      FROM SUPPLIER
      WHERE STATUS = 'A'
      ORDER BY SUPPLIER_ID
    `;

    connection.query(query, (err, rows) => {
      connection.end();
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

function runGlobalQuery(startDate, endDate) {
  return new Promise((resolve, reject) => {
    const vbsFilePath = path.join(__dirname, "asl-global-report.vbs");
    const cscriptPath = path.join(
      process.env.SYSTEMROOT,
      "SysWOW64",
      "cscript.exe",
    );

    const child = spawn(cscriptPath, [
      "//Nologo",
      vbsFilePath,
      startDate,
      endDate,
    ]);

    let output = "";
    let errorOutput = "";

    child.stdout.on("data", (data) => {
      output += data.toString();
    });

    child.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    child.on("close", (code) => {
      if (code !== 0 || errorOutput) {
        return reject(
          new Error(`VBScript error (code ${code}): ${errorOutput.trim()}`),
        );
      }

      try {
        const sanitized = output.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
        const parsed = JSON.parse(sanitized);
        if (parsed && parsed.error) {
          return reject(new Error(parsed.error));
        }
        resolve(Array.isArray(parsed) ? parsed : []);
      } catch (err) {
        reject(new Error(`JSON parse error: ${err.message}`));
      }
    });

    child.on("error", (err) => {
      reject(new Error(`Failed to spawn VBScript: ${err.message}`));
    });
  });
}

router.get("/", async (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({
      error: "startDate and endDate query params are required (YYYY-MM-DD)",
    });
  }

  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);

  if (!start || !end || start > end) {
    return res.status(400).json({
      error:
        "Invalid date range. Use YYYY-MM-DD and ensure startDate <= endDate",
    });
  }

  try {
    const [aslRows, globalRows] = await Promise.all([
      fetchAslSuppliers(),
      runGlobalQuery(startDate, endDate),
    ]);

    const aslMap = new Map();
    for (const row of aslRows) {
      const supplierId = normalizeKey(row.SUPPLIER_ID);
      if (!supplierId) continue;
      aslMap.set(supplierId, {
        supplierId,
        supplierName: row.NAME || "",
      });
    }

    const globalAgg = new Map();

    for (const row of globalRows) {
      const vendor = normalizeKey(row.VENDOR);
      if (!vendor) continue;

      if (!globalAgg.has(vendor)) {
        globalAgg.set(vendor, {
          vendor,
          vendorName: "",
          poSet: new Set(),
          lineCount: 0,
          totalSpend: 0,
          onTimeLineCount: 0,
          lateOrOpenLineCount: 0,
        });
      }

      const agg = globalAgg.get(vendor);
      if (!agg.vendorName) {
        agg.vendorName = String(row.NAME_VENDOR || "").trim();
      }
      const po = String(row.PURCHASE_ORDER || "").trim();
      if (po) agg.poSet.add(po);
      agg.lineCount += 1;

      const extension = Number.parseFloat(row.EXTENSION || 0);
      if (!Number.isNaN(extension)) {
        agg.totalSpend += extension;
      }

      const due = parseGlobalDate(row.DATE_DUE_LINE);
      const received = parseGlobalDate(row.DATE_LAST_RECEIVED);

      if (due && received) {
        if (received <= due) {
          agg.onTimeLineCount += 1;
        } else {
          agg.lateOrOpenLineCount += 1;
        }
      } else {
        agg.lateOrOpenLineCount += 1;
      }
    }

    const matched = [];
    const globalOnly = [];
    const globalOnlyLines = [];
    const seenAslMatches = new Set();

    for (const [, agg] of globalAgg) {
      const asl = aslMap.get(agg.vendor);
      const row = {
        vendor: agg.vendor,
        vendorName: agg.vendorName,
        aslSupplierId: asl ? asl.supplierId : null,
        aslSupplierName: asl ? asl.supplierName : null,
        poCount: agg.poSet.size,
        lineCount: agg.lineCount,
        totalSpend: Number(agg.totalSpend.toFixed(2)),
        onTimeLineCount: agg.onTimeLineCount,
        lateOrOpenLineCount: agg.lateOrOpenLineCount,
      };

      if (asl) {
        matched.push(row);
        seenAslMatches.add(asl.supplierId);
      } else {
        globalOnly.push(row);
      }
    }

    const aslOnly = [];
    for (const [supplierId, supplier] of aslMap) {
      if (!seenAslMatches.has(supplierId)) {
        aslOnly.push({
          supplierId,
          supplierName: supplier.supplierName,
        });
      }
    }

    // Detailed line-level rows where Global vendor is not on ASL.
    for (const row of globalRows) {
      const vendor = normalizeKey(row.VENDOR);
      if (!vendor || aslMap.has(vendor)) continue;

      const received = parseGlobalDate(row.DATE_LAST_RECEIVED);

      globalOnlyLines.push({
        vendor,
        purchaseOrder: String(row.PURCHASE_ORDER || "").trim(),
        poType: String(row.PO_TYPE || "").trim(),
        part: String(row.PART || "").trim(),
        description: String(row.DESCRIPTION || "").trim(),
        dueDate: String(row.DATE_DUE_LINE || "").trim(),
        receivedDate: received
          ? String(row.DATE_LAST_RECEIVED || "").trim()
          : "",
        qtyOrder: Number.parseFloat(row.QTY_ORDER || 0) || 0,
        qtyReceived: Number.parseFloat(row.QTY_RECEIVED || 0) || 0,
        extension: Number.parseFloat(row.EXTENSION || 0) || 0,
      });
    }

    matched.sort((a, b) => b.totalSpend - a.totalSpend);
    globalOnly.sort((a, b) => b.totalSpend - a.totalSpend);
    aslOnly.sort((a, b) => a.supplierId.localeCompare(b.supplierId));
    globalOnlyLines.sort((a, b) => {
      if (a.purchaseOrder === b.purchaseOrder) {
        return a.vendor.localeCompare(b.vendor);
      }
      return b.purchaseOrder.localeCompare(a.purchaseOrder);
    });

    const totalLines =
      matched.reduce((sum, r) => sum + r.lineCount, 0) +
      globalOnly.reduce((sum, r) => sum + r.lineCount, 0);
    const totalSpend =
      matched.reduce((sum, r) => sum + r.totalSpend, 0) +
      globalOnly.reduce((sum, r) => sum + r.totalSpend, 0);

    res.json({
      summary: {
        startDate,
        endDate,
        aslSupplierCount: aslMap.size,
        globalVendorCount: globalAgg.size,
        matchedCount: matched.length,
        globalOnlyCount: globalOnly.length,
        globalOnlyLineCount: globalOnlyLines.length,
        aslOnlyCount: aslOnly.length,
        totalLines,
        totalSpend: Number(totalSpend.toFixed(2)),
      },
      matched,
      globalOnly,
      globalOnlyLines,
      aslOnly,
    });
  } catch (error) {
    console.error("[asl-global-report] error:", error);
    res.status(500).json({ error: error.message || "Unexpected server error" });
  }
});

module.exports = router;
