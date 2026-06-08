// processcert.mjs - Clean implementation for PROCESSCERT2 algorithm
// Handles UI flow: Fetch parent J52 → User selection → Generate cert → Show cert

const step1Form = document.getElementById("step1-form");
const fetchBtn = document.getElementById("fetch-btn");
const statusMsg = document.getElementById("status-msg");
const transactionsSection = document.getElementById("transactions-section");
const transactionsTable = document.getElementById("transactions-table");
const transactionsBody = document.getElementById("transactions-body");
const selectAllCheckbox = document.getElementById("select-all");
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
  transactionsBody.innerHTML = "";
  transactionsSection.style.display = "none";
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

  let hasContent = false;

  for (const entry of certData.certificateData) {
    if (entry.error) continue;

    const woNumber = `${entry.parentJ52.job}-${entry.parentJ52.suffix}`;
    const topAssembly = normalizePart(entry.parentJ52.part);
    const topAssemblyDesc = normalizePart(entry.partDescription || "");

    // Collect process sections: one per unique outside-processing operation description
    const processSections = new Map(); // key -> { processName, poNumber, rows[] }

    // Each child job defines the process it was sent out for (outsideProcessing ops).
    // Group children by their shared process description; each child = one row.
    let itemNum = 1;

    for (const childEntry of entry.childJobs || []) {
      for (const op of childEntry.hierarchy?.operations || []) {
        if (!op.outsideProcessing) continue;
        // Skip generic catch-all outside processing ops that don't represent a certifiable process
        // Check both description and subOpDescription since the displayed name uses subOpDescription first
        const opDesc = (op.description || op.operation || "")
          .trim()
          .toUpperCase();
        const subDesc = (op.subOpDescription || "").trim().toUpperCase();
        const NON_CERT_OPS = [
          "MISCELLANEOUS OUTSIDE",
          "MISC OUTSIDE",
          "MISCELLANEOUS",
          "PASSIVATE TO PRINT",
          "PARTS TRANSFERRED FROM WIP",
          "PARTS TRANSFERED FROM WIP",
        ];
        if (NON_CERT_OPS.includes(opDesc) || NON_CERT_OPS.includes(subDesc))
          continue;
        const key = (op.description || op.operation || "").trim();
        const processName = (
          op.subOpDescription ||
          op.description ||
          op.operation ||
          ""
        ).trim();
        // Skip ops with no meaningful process description
        if (!key && !processName) continue;
        if (!processSections.has(key)) {
          processSections.set(key, {
            processName,
            poNumber: op.poNumber || "",
            rows: [],
          });
        }
        processSections.get(key).rows.push({
          item: itemNum++,
          part: getChildPart(childEntry),
          partDesc: normalizePart(childEntry.childJob.partDescription || ""),
          trace:
            op.poNumber || getTraceId(childEntry.hierarchy?.itemHistory || []),
          traceHover: op.poNumber
            ? getTraceId(childEntry.hierarchy?.itemHistory || [])
            : "",
          qty: Math.abs(childEntry.childJob.quantity || 0),
          workOrder: `${childEntry.childJob.job}-${childEntry.childJob.suffix}`,
        });
      }
    }

    if (processSections.size === 0) continue;
    hasContent = true;

    for (const [, section] of processSections) {
      const processLabel = section.processName;

      const rowsHtml = section.rows
        .map(
          (row) =>
            `<tr>
              <td class="cert-td-center">${row.item}</td>
              <td>${row.part}${row.partDesc ? `<br><span style="font-size:0.85em;color:#333">${row.partDesc}</span>` : ""}</td>
              <td>${row.trace}</td>
              <td class="cert-td-center">${row.qty}</td>
              <td title="${row.traceHover ? "Trace ID: " + row.traceHover : ""}">${row.workOrder}</td>
            </tr>`,
        )
        .join("");

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

        <div class="cert-title-box"><strong>Certification of Processing</strong></div>

        <table class="cert-info-table">
          <tr>
            <td class="cert-lbl">Work Order Number:</td>
            <td class="cert-val">${woNumber}</td>
            <td class="cert-lbl">Top Assembly Number:</td>
            <td class="cert-val">${topAssembly}</td>
          </tr>
          <tr>
            <td class="cert-lbl">Part Number/Description:</td>
            <td class="cert-val" colspan="3">${topAssembly}${topAssemblyDesc ? ` &mdash; ${topAssemblyDesc}` : ""}</td>
          </tr>
        </table>

        <div class="cert-process-header">Process: ${processLabel}</div>
        <table class="cert-data-table">
          <thead>
            <tr>
              <th>ITEM</th>
              <th>PART NUMBER / DESCRIPTION</th>
              <th>TRACE ID</th>
              <th>QUANTITY</th>
              <th>WORK ORDER</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
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
    }
  }

  if (hasContent) {
    certOutput.style.display = "block";
    printBtn.style.display = "inline-block";
  } else {
    certOutput.innerHTML =
      "<p style='color:#666'>No outside processing operations found for the selected transaction(s).</p>";
    certOutput.style.display = "block";
  }
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
 * Step 1: Fetch parent J52 transactions
 */
step1Form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const job = document.getElementById("job").value;

  if (!job) {
    showStatus("Please enter a job number", "error");
    return;
  }

  showStatus("Fetching parent transactions...", "loading");
  selectedIndices.clear();

  try {
    // Call the legacy endpoint that returns parent J52s
    // For now, we can reuse the existing processcert-coc endpoint with just Step 1
    // OR we need to create a simpler endpoint that just gets J52s

    // Let's create a temporary approach: fetch from /processcert/build-cert first
    // to get parent transactions and hierarchy
    const params = new URLSearchParams({ job });
    const response = await fetch(`/processcert/build-cert?${params}`);

    if (!response.ok) {
      const error = await response.json();
      showStatus(
        `Error: ${error.error}${error.details ? " — " + error.details : ""}`,
        "error",
      );
      return;
    }

    // Extract parent J52s from the response
    // The /build-cert endpoint returns certificateData which is an array of results
    // Each result has parentJ52 with the parent transaction details
    const data = await response.json();
    if (data.certificateData && data.certificateData.length > 0) {
      parentJ52Transactions = data.certificateData.map((result) => ({
        DATE_HISTORY: result.parentJ52.dateHistory || "",
        TIME_ITEM_HISTORY: result.parentJ52.timeItemHistory || "",
        QUANTITY: result.parentJ52.quantity || 0,
        JOB: result.parentJ52.job || "",
        SUFFIX: result.parentJ52.suffix || "",
        PART: result.parentJ52.part || "",
      }));
    } else {
      showStatus("No parent transactions found", "error");
      return;
    }

    if (
      !Array.isArray(parentJ52Transactions) ||
      parentJ52Transactions.length === 0
    ) {
      showStatus("No parent J52 transactions found for this job", "error");
      return;
    }

    showStatus(
      `Found ${parentJ52Transactions.length} parent transaction(s)`,
      "success",
    );

    // Render transactions table
    renderTransactionsTable();
    transactionsSection.style.display = "block";
  } catch (error) {
    console.error("Fetch error:", error);
    showStatus(`Error: ${error.message}`, "error");
  }
});

/**
 * Render transactions in table
 */
function renderTransactionsTable() {
  transactionsBody.innerHTML = "";

  parentJ52Transactions.forEach((row, idx) => {
    const tr = document.createElement("tr");

    const checkboxTd = document.createElement("td");
    checkboxTd.className = "checkbox-cell";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.dataset.index = idx;
    checkbox.addEventListener("change", (e) => {
      if (e.target.checked) {
        selectedIndices.add(idx);
      } else {
        selectedIndices.delete(idx);
      }
      updateSelectAllCheckbox();
    });
    checkboxTd.appendChild(checkbox);

    tr.appendChild(checkboxTd);
    tr.appendChild(createCell(row.DATE_HISTORY || ""));
    tr.appendChild(createCell(row.TIME_ITEM_HISTORY || ""));
    tr.appendChild(createCell(row.JOB || ""));
    tr.appendChild(createCell(row.SUFFIX || ""));
    tr.appendChild(createCell(row.QUANTITY || ""));
    tr.appendChild(createCell(row.PART || ""));

    transactionsBody.appendChild(tr);
  });

  console.log("Sample row data:", parentJ52Transactions[0]);
}

/**
 * Create table cell
 */
function createCell(content) {
  const td = document.createElement("td");
  td.textContent = content;
  return td;
}

/**
 * Update "Select All" checkbox state
 */
function updateSelectAllCheckbox() {
  const allCheckboxes = Array.from(
    transactionsBody.querySelectorAll('input[type="checkbox"]'),
  );
  selectAllCheckbox.checked =
    allCheckboxes.length > 0 && allCheckboxes.every((cb) => cb.checked);
}

/**
 * Handle "Select All" checkbox
 */
selectAllCheckbox.addEventListener("change", (e) => {
  const checkboxes = transactionsBody.querySelectorAll(
    'input[type="checkbox"]',
  );
  if (e.target.checked) {
    checkboxes.forEach((cb, idx) => {
      cb.checked = true;
      selectedIndices.add(idx);
    });
  } else {
    checkboxes.forEach((cb, idx) => {
      cb.checked = false;
      selectedIndices.delete(idx);
    });
  }
});

/**
 * Step 2: Generate certificate (call /processcert/build-cert)
 */
genCertBtn.addEventListener("click", async () => {
  if (selectedIndices.size === 0) {
    showStatus("Please select at least one transaction", "error");
    return;
  }

  const job = document.getElementById("job").value;
  const indices = Array.from(selectedIndices).sort().join(",");

  // Clear previous cert output before generating a new one
  const certOutput = document.getElementById("cert-output");
  certOutput.innerHTML = "";
  certOutput.style.display = "none";
  printBtn.style.display = "none";
  jsonDebugDiv.style.display = "none";
  jsonToggleSection.style.display = "none";
  jsonToggleBtn.textContent = "Show JSON";

  showStatus("Generating certificate...", "loading");

  try {
    const params = new URLSearchParams({
      job,
      selectedIndices: indices,
    });

    const response = await fetch(`/processcert/build-cert?${params}`);

    if (!response.ok) {
      const error = await response.json();
      showStatus(
        `Error: ${error.error}${error.details ? " — " + error.details : ""}`,
        "error",
      );
      console.error("Error details:", error);
      return;
    }

    const certData = await response.json();
    lastResponse = certData;

    const qaUser = document.getElementById("qaUser").value;
    renderCert(certData, qaUser);

    // Populate JSON debug view (hidden by default)
    jsonOutput.textContent = JSON.stringify(
      {
        success: certData.success,
        job: certData.job,
        selectedIndices: certData.selectedIndices,
        certificateData: certData.certificateData,
        timestamp: certData.timestamp,
      },
      null,
      2,
    );
    jsonToggleSection.style.display = "block";

    showStatus(
      `Certificate generated successfully (${certData.certificateData.length} parent(s))`,
      "success",
    );
  } catch (error) {
    console.error("Generation error:", error);
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
