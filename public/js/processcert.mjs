// processcert.mjs - Clean implementation for PROCESSCERT2 algorithm
// Handles UI flow: Fetch parent J52 → User selection → Generate cert → Show cert

// Special process codes that should be highlighted on certificates
const SPECIAL_PROCESS_CODES = [
  "SPOTW", // Spot Welding
  "6061", // Passivation spec
  "ALODINE", // Alodine passivation
  "WELD", // Welding processes
  "NADCAP", // NADCAP certified processes
  "CHEM FILM", // Chemical film
  "PASSIV", // Passivation (catches PASSIVATE, PASSIVATION, etc.)
];

// Operations to exclude as generic catch-alls
const TRULY_NON_CERT_OPS = [
  "MISCELLANEOUS OUTSIDE",
  "MISC OUTSIDE",
  "MISCELLANEOUS",
  "PARTS TRANSFERRED FROM WIP",
  "PARTS TRANSFERED FROM WIP",
];

/**
 * Check if an operation is a special process
 */
function isSpecialProcess(processName) {
  if (!processName) return false;
  const upperName = processName.trim().toUpperCase();
  return SPECIAL_PROCESS_CODES.some((code) =>
    upperName.includes(code.toUpperCase()),
  );
}

const step1Form = document.getElementById("step1-form");
const statusMsg = document.getElementById("status-msg");
const genCertBtn = document.getElementById("gen-cert");
const clearBtn = document.getElementById("clear-btn");
const printBtn = document.getElementById("print-btn");
const jsonDebugDiv = document.getElementById("json-debug");
const jsonOutput = document.getElementById("json-output");
const jsonToggleSection = document.getElementById("json-toggle-section");
const jsonToggleBtn = document.getElementById("json-toggle-btn");

let parentJ52Transactions = [];
let lastResponse = null; // Store full response for debugging
const selectedIndices = new Set();

/**
 * Display status message
 */
function showStatus(message, type = "loading") {
  statusMsg.textContent = message;
  statusMsg.className = `status ${type}`;
}

/**
 * Clear all selections
 */
function clearAll() {
  selectedIndices.clear();
  jsonDebugDiv.style.display = "none";
  jsonToggleSection.style.display = "none";
  jsonToggleBtn.textContent = "Show JSON";
  statusMsg.className = "status";
  statusMsg.textContent = "";
  parentJ52Transactions = [];
  const certOutput = document.getElementById("cert-output");
  certOutput.innerHTML = "";
  certOutput.style.display = "none";
  printBtn.style.display = "none";
  document.getElementById("packingSlip").value = "";
}

/**
 * Format date and time for display
 */
function formatDateTime(date, time) {
  const dateStr = date ? String(date).substring(0, 10) : "";
  const timeStr = time ? String(time).substring(0, 8) : "";
  return `${dateStr} ${timeStr}`.trim();
}

/**
 * Normalize a fixed-width DB string (collapse internal spaces, trim)
 */
function normalizePart(str) {
  return (str || "").replace(/\s+/g, " ").trim();
}

/**
 * Get the part number (router) from a child job's operations
 */
function getChildPart(childEntry) {
  const ops = childEntry.hierarchy?.operations || [];
  for (const op of ops) {
    const router = (op.router || "").trim();
    if (router) return normalizePart(router);
  }
  return `${childEntry.childJob.job}-${childEntry.childJob.suffix}`;
}

/**
 * Get quantity from itemHistory
 */
function getQuantityFromHistory(itemHistory) {
  for (const item of itemHistory || []) {
    const code = (item.codeTransaction || "").trim();
    // Look for J52 (parent transaction) which should have the quantity
    if (code === "J52" || code === "J55") {
      const qty = item.quantity;
      if (qty !== null && qty !== undefined && qty !== "") {
        return Math.abs(Number(qty) || 0);
      }
    }
  }
  return 0;
}

/**
 * Get a material trace ID from itemHistory.
 * Looks for J55 transactions that are raw material (not job references, not PO: prefixed).
 */
function getTraceId(itemHistory) {
  for (const item of itemHistory || []) {
    const code = (item.codeTransaction || "").trim();
    if (code !== "J55") continue;
    const serial = (item.serialNumber || "").trim();
    if (serial && !serial.match(/^\d{6}-\d{3}/) && !serial.startsWith("PO:")) {
      return serial;
    }
    const lot = (item.lot || "").trim();
    if (lot) return lot;
  }
  return "";
}

/**
 * Render the Certificate of Processing into #cert-output.
 */
function renderCert(certData, qaUser) {
  const certOutput = document.getElementById("cert-output");
  certOutput.innerHTML = "";

  const today = new Date().toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });

  // Collect all process sections across ALL entries into one combined map
  // key = processName, value = { processName, poNumber, rows[] }
  const processSections = new Map();
  const workOrders = new Set();
  let topAssembly = "";
  let topAssemblyDesc = "";

  for (const entry of certData.certificateData) {
    if (entry.error) continue;

    const woNumber = `${entry.parentJ52.job}-${entry.parentJ52.suffix}`;
    workOrders.add(woNumber);
    const entryPart = normalizePart(entry.parentJ52.part).replace(
      /\s+-\s*$/,
      "",
    );
    const entryPartDesc = normalizePart(entry.partDescription || "");
    if (!topAssembly) {
      topAssembly = entryPart;
      topAssemblyDesc = entryPartDesc;
    }

    // ====================================================================
    // PARENT job's outside processing operations
    // ====================================================================
    if (Array.isArray(entry.hierarchy?.operations)) {
      for (const op of entry.hierarchy.operations) {
        if (!op.outsideProcessing) continue;

        const opDesc = (op.description || op.operation || "")
          .trim()
          .toUpperCase();
        const subDesc = (op.subOpDescription || "").trim().toUpperCase();
        if (
          TRULY_NON_CERT_OPS.includes(opDesc) ||
          TRULY_NON_CERT_OPS.includes(subDesc)
        )
          continue;

        const processCode = (op.operation || "").trim();
        const processDesc = (
          op.partWcOutside?.trim() ||
          op.subOpDescription ||
          op.description ||
          ""
        ).trim();
        const processName = `${processCode} ${processDesc}`.trim();
        if (!processName || !isSpecialProcess(processName)) continue;

        if (!processSections.has(processName)) {
          processSections.set(processName, {
            processName,
            processCode,
            processDesc,
            poNumber: op.poNumber || "",
            rows: [],
          });
        }
        processSections.get(processName).rows.push({
          part: entryPart,
          partDesc: entryPartDesc,
          trace: op.poNumber || "",
          traceHover: "",
          qty: getQuantityFromHistory(entry.hierarchy?.itemHistory || []),
          workOrder: woNumber,
          isParent: true,
        });
      }
    }

    // ====================================================================
    // CHILD jobs' outside processing operations
    // ====================================================================
    for (const childEntry of entry.childJobs || []) {
      for (const op of childEntry.hierarchy?.operations || []) {
        if (!op.outsideProcessing) continue;

        const opDesc = (op.description || op.operation || "")
          .trim()
          .toUpperCase();
        const subDesc = (op.subOpDescription || "").trim().toUpperCase();
        if (
          TRULY_NON_CERT_OPS.includes(opDesc) ||
          TRULY_NON_CERT_OPS.includes(subDesc)
        )
          continue;

        const processCode = (op.operation || "").trim();
        const processDesc = (
          op.partWcOutside?.trim() ||
          op.subOpDescription ||
          op.description ||
          ""
        ).trim();
        const processName = `${processCode} ${processDesc}`.trim();
        if (!processName || !isSpecialProcess(processName)) continue;

        if (!processSections.has(processName)) {
          processSections.set(processName, {
            processName,
            processCode,
            processDesc,
            poNumber: op.poNumber || "",
            rows: [],
          });
        }

        const childWo = `${childEntry.childJob.job}-${childEntry.childJob.suffix}`;
        processSections.get(processName).rows.push({
          part: getChildPart(childEntry),
          partDesc: normalizePart(childEntry.childJob.partDescription || ""),
          trace:
            op.poNumber || getTraceId(childEntry.hierarchy?.itemHistory || []),
          traceHover: op.poNumber
            ? getTraceId(childEntry.hierarchy?.itemHistory || [])
            : "",
          qty: getQuantityFromHistory(childEntry.hierarchy?.itemHistory || []),
          workOrder: childWo,
          isParent: false,
        });
      }
    }
  }

  // Deduplicate rows within each process section
  for (const [, section] of processSections) {
    // Collect traces that are covered by at least one child row
    const childTraces = new Set(
      section.rows.filter((r) => !r.isParent && r.trace).map((r) => r.trace),
    );
    // Suppress parent rows whose trace is already represented by a child row
    // (parent job carries the op for costing/scheduling; child is where work was done)
    section.rows = section.rows.filter(
      (r) => !r.isParent || !childTraces.has(r.trace),
    );
    // Deduplicate remaining rows (same part + trace + workOrder)
    const seen = new Set();
    section.rows = section.rows.filter((row) => {
      const key = [row.part, row.trace, row.workOrder].join("|");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  if (processSections.size === 0) {
    certOutput.innerHTML =
      "<p style='color:#666'>No outside processing operations found for the selected transaction(s).</p>";
    certOutput.style.display = "block";
    return;
  }

  // Build single table body with all process sections
  let allProcessRowsHtml = `
    <thead>
      <tr>
        <th>ITEM</th>
        <th>PART NUMBER / DESCRIPTION</th>
        <th>TRACE ID</th>
        <th>WORK ORDER</th>
      </tr>
    </thead>
    <tbody>
  `;

  for (const [, section] of processSections) {
    const isSpecial = isSpecialProcess(section.processName);
    allProcessRowsHtml += `
      <tr class="cert-process-row${isSpecial ? " cert-process-row-special" : ""}">
        <td colspan="4" class="cert-process-header-cell${isSpecial ? " cert-process-header-cell-special" : ""}">
          <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
            <strong${section.processCode ? ` title="Op code: ${section.processCode}" style="cursor:help"` : ""}>Process: ${section.processDesc || section.processName}</strong>
          </div>
        </td>
      </tr>
    `;
    let itemNum = 1;
    for (const row of section.rows) {
      allProcessRowsHtml += `
        <tr>
          <td class="cert-td-center">${itemNum++}</td>
          <td>${row.part}${row.partDesc ? `<br><span style="font-size:0.85em;color:#333">${row.partDesc}</span>` : ""}</td>
          <td>${row.trace}</td>
          <td title="${row.traceHover ? "Trace ID: " + row.traceHover : ""}">${row.workOrder}</td>
        </tr>
      `;
    }
  }
  allProcessRowsHtml += `</tbody>`;

  // Header: packing slip or work order list
  const packingSlip = certData.packingSlip || "";
  const woDisplay = packingSlip
    ? `Packing Slip: ${packingSlip}`
    : Array.from(workOrders).join(", ");

  const doc = document.createElement("div");
  doc.className = "cert-document";
  doc.innerHTML = `
    <div class="cert-header">
      <div class="cert-logo-area">
        <img src="/images/ci-logo.png" alt="CI" class="cert-logo">
      </div>
      <div class="cert-address-area">
        2990 South Main Street, Salt Lake City, Utah 84115<br>
        Telephone: (801) 466-3334 &bull; Fax: (801) 466-1441
      </div>
    </div>

    <div class="cert-title-box"><strong>Certificate of Processing</strong></div>

    <table class="cert-info-table">
      <tr>
        <td class="cert-lbl">Packing Slip:</td>
        <td class="cert-val">${packingSlip}</td>
        <td class="cert-lbl">Top Assembly Number:</td>
        <td class="cert-val">${topAssembly}</td>
      </tr>
      <tr>
        <td class="cert-lbl">Work Order(s):</td>
        <td class="cert-val" colspan="3">${(certData.jobs || []).map((j) => `${j.job}-${j.suffix}`).join(", ")}</td>
      </tr>
    </table>

    <table class="cert-data-table">
      ${allProcessRowsHtml}
    </table>

    <div class="cert-statement">
      I certify that the listed materials were processed in conformance with the
      designated specifications and the latest drawing revisions on record.
    </div>

    <div class="cert-signature">
      <div class="cert-sig-line-spacer"></div>
      <div class="cert-sig-underline"></div>
      <div class="cert-sig-name">${qaUser || "Quality Assurance"}</div>
      <div class="cert-sig-role">Quality Assurance</div>
      <div class="cert-sig-date">Date: ${today}</div>
    </div>
  `;
  certOutput.appendChild(doc);

  certOutput.style.display = "block";
  printBtn.style.display = "inline-block";
}

/**
 * Load user from session on page load
 */
document.addEventListener("DOMContentLoaded", async () => {
  const qaUserField = document.getElementById("qaUser");

  try {
    const response = await fetch("/user/me/name", {
      credentials: "include",
    });

    if (response.ok) {
      const data = await response.json();
      qaUserField.value =
        `${data.firstName} ${data.lastName}`.trim() || "QA User";
    } else {
      const userResponse = await fetch("/user/me", {
        credentials: "include",
      });
      if (userResponse.ok) {
        const userData = await userResponse.json();
        qaUserField.value = userData.username || "QA User";
      }
    }
  } catch (error) {
    console.error("Error loading user:", error);
    qaUserField.value = "QA User";
  }
});

/**
 * Step 1: Fetch jobs from packing slip and generate certificate
 */
step1Form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const packingSlip = document
    .getElementById("packingSlip")
    .value.trim()
    .padStart(6, "0");

  if (!packingSlip) {
    showStatus("Please enter a packing slip number", "error");
    return;
  }

  showStatus("Looking up jobs from packing slip...", "loading");
  clearAll();

  try {
    // Fetch jobs from packing slip
    const params = new URLSearchParams({ pck_no: packingSlip });
    const jobsResponse = await fetch(
      `/processcert/jobs-by-packing-slip?${params}`,
    );

    if (!jobsResponse.ok) {
      const error = await jobsResponse.json();
      showStatus(
        `Error: ${error.error}${error.details ? " — " + error.details : ""}`,
        "error",
      );
      return;
    }

    const jobsData = await jobsResponse.json();
    const jobs = jobsData.jobs || [];

    if (!jobs || jobs.length === 0) {
      showStatus("No jobs found for this packing slip", "error");
      return;
    }

    showStatus(
      `Found ${jobs.length} job(s), generating certificate...`,
      "loading",
    );

    // Fetch all jobs in parallel
    const jobResults = await Promise.all(
      jobs.map(async (job) => {
        try {
          const certParams = new URLSearchParams({
            job: job.job,
            suffix: job.suffix,
          });
          const certResponse = await fetch(
            `/processcert/build-cert?${certParams}`,
          );
          if (!certResponse.ok) {
            console.warn(
              `Error fetching job ${job.job}-${job.suffix}:`,
              await certResponse.json(),
            );
            return null;
          }
          const certData = await certResponse.json();
          return certData.certificateData &&
            Array.isArray(certData.certificateData)
            ? certData.certificateData
            : null;
        } catch (error) {
          console.warn(`Error processing job ${job.job}-${job.suffix}:`, error);
          return null;
        }
      }),
    );

    const allCertificateData = jobResults.flat().filter(Boolean);

    if (allCertificateData.length === 0) {
      showStatus("No certificate data found for these jobs", "error");
      return;
    }

    // Render certificate with combined data
    const qaUser = document.getElementById("qaUser").value;
    const combinedResponse = {
      success: true,
      packingSlip: packingSlip,
      jobs: jobs,
      certificateData: allCertificateData,
      timestamp: new Date().toISOString(),
    };

    lastResponse = combinedResponse;
    renderCert(combinedResponse, qaUser);

    // Populate JSON debug view
    jsonOutput.textContent = JSON.stringify(
      {
        success: combinedResponse.success,
        packingSlip: combinedResponse.packingSlip,
        jobs: combinedResponse.jobs,
        certificateData: combinedResponse.certificateData,
        timestamp: combinedResponse.timestamp,
      },
      null,
      2,
    );

    // Show certificate output
    const certOutput = document.getElementById("cert-output");
    certOutput.style.display = "block";
    printBtn.style.display = "inline-block";
    jsonToggleSection.style.display = "block";

    showStatus("Certificate generated successfully", "success");
  } catch (error) {
    console.error("Fetch error:", error);
    showStatus(`Error: ${error.message}`, "error");
  }
});

/**
 * Clear button
 */
clearBtn.addEventListener("click", clearAll);

/**
 * Print button
 */
printBtn.addEventListener("click", () => window.print());

/**
 * JSON toggle button
 */
jsonToggleBtn.addEventListener("click", () => {
  const visible = jsonDebugDiv.style.display !== "none";
  jsonDebugDiv.style.display = visible ? "none" : "block";
  jsonToggleBtn.textContent = visible ? "Show JSON" : "Hide JSON";
});
