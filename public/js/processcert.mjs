// processcert-v2.mjs - Clean implementation for PROCESSCERT2 algorithm
// Handles UI flow: Fetch parent J52 → User selection → Generate cert → Show JSON

const step1Form = document.getElementById("step1-form");
const fetchBtn = document.getElementById("fetch-btn");
const statusMsg = document.getElementById("status-msg");
const transactionsSection = document.getElementById("transactions-section");
const transactionsTable = document.getElementById("transactions-table");
const transactionsBody = document.getElementById("transactions-body");
const selectAllCheckbox = document.getElementById("select-all");
const genCertBtn = document.getElementById("gen-cert");
const clearBtn = document.getElementById("clear-btn");
const jsonDebugDiv = document.getElementById("json-debug");
const jsonOutput = document.getElementById("json-output");

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
  statusMsg.className = "status";
  statusMsg.textContent = "";
  parentJ52Transactions = [];
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
      showStatus(`Error: ${error.error}`, "error");
      return;
    }

    const data = await response.json();

    // Extract parent J52s from the response
    // The /build-cert endpoint returns certificateData which is an array of results
    // Each result has parentJ52 with the parent transaction details
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

  showStatus("Generating certificate...", "loading");

  try {
    const params = new URLSearchParams({
      job,
      selectedIndices: indices,
    });

    const response = await fetch(`/processcert/build-cert?${params}`);

    if (!response.ok) {
      const error = await response.json();
      showStatus(`Error: ${error.error}`, "error");
      console.error("Error details:", error);
      return;
    }

    const certData = await response.json();
    lastResponse = certData; // Store for debugging

    // Display processed certificate data
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
    jsonDebugDiv.style.display = "block";

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
