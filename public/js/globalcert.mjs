// globalcert.mjs - Certificate of Processing generation from inventory history

const inventoryForm = document.getElementById("inventory-form");
const inventoryResults = document.getElementById("inventory-results");
const inventoryWorking = document.getElementById("inventory-working");
const certResults = document.getElementById("cert-results");

let currentInventoryData = []; // Store the fetched inventory history
let selectedWorkorders = new Set(); // Track selected work orders (with date/time discrimination)
let currentOperationData = {}; // Store operations by transaction key

// Operation to Specification mapping
const operationSpecMap = {
  HEAT: "AMS 2750",
  D172: "AMS 2700",
  FUSION: "AWS-A4.2",
  D171: "AMS 2750",
  PASSM2: "AMS 2700",
  PASST6: "AMS 2700",
  BLAN1: "AMS 2700",
  FT1C1A: "ASTM B117",
  "23377A": "AMS 2700",
  PAINT2: "MIL-PRF-23236",
  KITTG: "",
  ATTACH: "",
  FINALI: "",
  MARKPT: "",
  SHEAR: "",
  PUNCH: "",
  INSP04: "",
  SANDEB: "",
  COUNTS: "",
  BEND: "",
  INSP05: "",
  TUMDEB: "",
  INSP02: "",
  INSP08: "",
};

// Initialize page - populate user field from session
document.addEventListener("DOMContentLoaded", async () => {
  const qaUserField = document.getElementById("qaUser");

  try {
    // Get full name from new endpoint
    const response = await fetch("/user/me/name", {
      credentials: "include",
    });

    if (response.ok) {
      const data = await response.json();
      const fullName = `${data.firstName} ${data.lastName}`.trim();
      qaUserField.value = fullName || data.firstName || "QA User";
    } else {
      // Fallback to username
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

// Step 1: Fetch inventory history transactions (via processcert-coc)
inventoryForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  inventoryResults.innerHTML = "";
  certResults.innerHTML = "";
  inventoryWorking.style.display = "block";

  const job = document.getElementById("job").value;

  if (!job) {
    inventoryWorking.style.display = "none";
    inventoryResults.innerHTML = "Please enter a job number.";
    return;
  }

  try {
    // Fetch inventory history from processcert-coc endpoint (Step 1 only - no selectedIndices)
    const params = new URLSearchParams({ job });

    const res = await fetch(`/globalcert/processcert-coc?${params}`);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to fetch inventory");
    }

    const resData = await res.json();
    currentInventoryData = resData.step1_j52_transactions || [];
    const step3Data = resData.step3_coc_links || [];

    if (
      !Array.isArray(currentInventoryData) ||
      currentInventoryData.length === 0
    ) {
      inventoryResults.innerHTML =
        "<p>No inventory transactions found for the specified criteria.</p>";
      inventoryWorking.style.display = "none";
      return;
    }

    // Display inventory transactions in a table with checkboxes
    const table = document.createElement("table");
    table.className = "inventory-table";
    table.innerHTML = `<thead><tr>
      <th style="width: 40px;">Select</th>
      <th>Date</th>
      <th>Time</th>
      <th>Part</th>
      <th>Quantity</th>
      <th>Job</th>
      <th>Suffix</th>
    </tr></thead><tbody></tbody>`;

    currentInventoryData.forEach((row, index) => {
      const tr = document.createElement("tr");
      const rowId = String(index); // Use array index as the row ID
      tr.setAttribute("data-row-id", rowId);

      // Checkbox
      const tdCheckbox = document.createElement("td");
      tdCheckbox.className = "checkbox-cell";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "row-checkbox";
      checkbox.value = rowId;
      checkbox.addEventListener("change", (e) => {
        if (e.target.checked) {
          selectedWorkorders.add(rowId);
          tr.classList.add("selected");
        } else {
          selectedWorkorders.delete(rowId);
          tr.classList.remove("selected");
        }
      });
      tdCheckbox.appendChild(checkbox);
      tr.appendChild(tdCheckbox);

      // Date
      const tdDate = document.createElement("td");
      tdDate.textContent = row.dateHistory || "";
      tr.appendChild(tdDate);

      // Time
      const tdTime = document.createElement("td");
      tdTime.textContent = row.timeItemHistory || "";
      tr.appendChild(tdTime);

      // Part
      const tdPart = document.createElement("td");
      tdPart.textContent = (row.part || "").trim();
      tr.appendChild(tdPart);

      // Quantity
      const tdQty = document.createElement("td");
      tdQty.textContent = row.quantity || "";
      tr.appendChild(tdQty);

      // Job
      const tdJob = document.createElement("td");
      tdJob.textContent = row.job || "";
      tr.appendChild(tdJob);

      // Suffix
      const tdSuffix = document.createElement("td");
      tdSuffix.textContent = row.suffix || "";
      tr.appendChild(tdSuffix);

      table.querySelector("tbody").appendChild(tr);
    });

    // Auto-select single row if only one transaction
    if (currentInventoryData.length === 1) {
      const checkbox = table.querySelector(".row-checkbox");
      checkbox.checked = true;
      const rowId = checkbox.value;
      selectedWorkorders.add(rowId);
      checkbox.closest("tr").classList.add("selected");
    }

    inventoryResults.innerHTML =
      "<h3>Inventory History Transactions - Select rows to include in certificate:</h3>";
    inventoryResults.appendChild(table);

    // Render JSON debug output for step3_coc_links
    const jsonDebugDiv = document.getElementById("json-debug");
    const jsonRowsContainer = document.getElementById("json-rows-container");
    jsonRowsContainer.innerHTML = "";

    step3Data.forEach((coc, index) => {
      const rowDiv = document.createElement("div");
      rowDiv.className = "json-row-debug";
      rowDiv.style.cssText = `
        margin-bottom: 20px;
        padding: 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        background-color: #f9f9f9;
        font-family: monospace;
        font-size: 12px;
      `;

      const header = document.createElement("div");
      header.style.cssText = `
        font-weight: bold;
        margin-bottom: 8px;
        color: #333;
        border-bottom: 1px solid #ccc;
        padding-bottom: 6px;
      `;
      const parentJ52 = coc.parent_j52 || {};
      const childJob = coc.child_job || {};
      header.textContent = `CoC Link ${index}: ${parentJ52.job}-${parentJ52.suffix} → ${childJob.job}-${childJob.suffix}`;
      rowDiv.appendChild(header);

      const pre = document.createElement("pre");
      pre.style.cssText = `
        margin: 0;
        overflow-x: auto;
        white-space: pre-wrap;
        word-wrap: break-word;
        color: #333;
      `;
      pre.textContent = JSON.stringify(coc, null, 2);
      rowDiv.appendChild(pre);

      jsonRowsContainer.appendChild(rowDiv);
    });

    jsonDebugDiv.style.display = "block";

    // Show testing controls after inventory loads
    const testingControls = document.getElementById("testing-controls");
    if (testingControls) {
      testingControls.style.display = "block";
    }

    // Add button group below table
    const buttonGroup = document.createElement("div");
    buttonGroup.className = "button-group";

    const selectAllBtn = document.createElement("button");
    selectAllBtn.type = "button";
    selectAllBtn.textContent = "Select All";
    selectAllBtn.addEventListener("click", () => {
      const checkboxes = table.querySelectorAll(".row-checkbox");
      checkboxes.forEach((cb) => {
        if (!cb.checked) {
          cb.checked = true;
          selectedWorkorders.add(cb.value);
          cb.closest("tr").classList.add("selected");
        }
      });
    });

    const deselectAllBtn = document.createElement("button");
    deselectAllBtn.type = "button";
    deselectAllBtn.textContent = "Deselect All";
    deselectAllBtn.addEventListener("click", () => {
      const checkboxes = table.querySelectorAll(".row-checkbox");
      checkboxes.forEach((cb) => {
        if (cb.checked) {
          cb.checked = false;
          selectedWorkorders.delete(cb.value);
          cb.closest("tr").classList.remove("selected");
        }
      });
    });

    const generateCertBtn = document.createElement("button");
    generateCertBtn.type = "button";
    generateCertBtn.textContent = "Generate Certificate";
    generateCertBtn.addEventListener("click", handleGenerateCert);

    buttonGroup.appendChild(selectAllBtn);
    buttonGroup.appendChild(deselectAllBtn);
    buttonGroup.appendChild(generateCertBtn);
    inventoryResults.appendChild(buttonGroup);
  } finally {
    inventoryWorking.style.display = "none";
  }
});

// Generate certificate for selected rows (Step 3: Chain of Custody)
async function handleGenerateCert() {
  if (selectedWorkorders.size === 0) {
    certResults.innerHTML =
      "<p style='color: red;'>Please select at least one transaction.</p>";
    return;
  }

  certResults.innerHTML = "<p>Generating certificate...</p>";

  try {
    // Get the job number from the first inventory row
    const job = currentInventoryData[0]?.job;
    if (!job) {
      certResults.innerHTML = "<p style='color: red;'>No job found.</p>";
      return;
    }

    // Convert selectedWorkorders Set to comma-separated string of indices
    const selectedIndicesStr = Array.from(selectedWorkorders)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .join(",");

    // Call processcert-coc with selectedIndices to get Steps 1-3 complete data
    const params = new URLSearchParams({
      job,
      selectedIndices: selectedIndicesStr,
    });

    const res = await fetch(`/globalcert/processcert-coc?${params}`);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to generate certificate");
    }

    const cocData = await res.json();
    if (!cocData.success) {
      throw new Error("CoC generation failed");
    }

    // cocData now contains:
    // - step1_j52_transactions
    // - selectedIndices
    // - step3_coc_links (array of CoC entries with parent/operation/child data)

    const cocLinks = cocData.step3_coc_links || [];
    if (cocLinks.length === 0) {
      certResults.innerHTML = "<p>No chain-of-custody data generated.</p>";
      return;
    }

    // Display CoC data
    let html = "<h3>Chain of Custody - Generated from Steps 1-3</h3>";
    html += "<table class='coc-table'><thead><tr>";
    html +=
      "<th>Parent Job</th><th>Parent Suffix</th><th>Operation</th><th>Router</th>";
    html +=
      "<th>Child Job</th><th>Child Suffix</th><th>Child Part</th><th>Material Pulls</th>";
    html += "</tr></thead><tbody>";

    cocLinks.forEach((coc) => {
      const parentJ52 = coc.parent_j52 || {};
      const op = coc.operation || {};
      const childJob = coc.child_job || {};
      const childHeader = childJob.header || {};

      const materialPullsHtml =
        (childJob.material_pulls || [])
          .map(
            (m) =>
              `${m.codeTransaction}: ${m.part.trim()} (Qty: ${m.quantity})`,
          )
          .join("<br>") || "None";

      html += `<tr>
        <td>${parentJ52.job || ""}</td>
        <td>${parentJ52.suffix || ""}</td>
        <td>${op.operation || ""}</td>
        <td>${op.router_desc ? op.router_desc.trim() : ""}</td>
        <td>${childJob.job || ""}</td>
        <td>${childJob.suffix || ""}</td>
        <td>${childHeader.part ? childHeader.part.trim() : ""}</td>
        <td>${materialPullsHtml}</td>
      </tr>`;
    });

    html += "</tbody></table>";
    certResults.innerHTML = html;

    // Render JSON debug output for each CoC link
    const jsonDebugDiv = document.getElementById("json-debug");
    const jsonRowsContainer = document.getElementById("json-rows-container");
    jsonRowsContainer.innerHTML = "";

    const debugTitle = document.createElement("h3");
    debugTitle.textContent = "Raw CoC JSON Data (Debug View)";
    jsonRowsContainer.appendChild(debugTitle);

    cocLinks.forEach((coc, index) => {
      const rowDiv = document.createElement("div");
      rowDiv.className = "json-row-debug";
      rowDiv.style.cssText = `
        margin-bottom: 20px;
        padding: 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        background-color: #f9f9f9;
        font-family: monospace;
        font-size: 12px;
      `;

      const header = document.createElement("div");
      header.style.cssText = `
        font-weight: bold;
        margin-bottom: 8px;
        color: #333;
        border-bottom: 1px solid #ccc;
        padding-bottom: 6px;
      `;
      const parentJ52 = coc.parent_j52 || {};
      const childJob = coc.child_job || {};
      header.textContent = `CoC Link ${index}: ${parentJ52.job}-${parentJ52.suffix} → ${childJob.job}-${childJob.suffix}`;
      rowDiv.appendChild(header);

      const pre = document.createElement("pre");
      pre.style.cssText = `
        margin: 0;
        overflow-x: auto;
        white-space: pre-wrap;
        word-wrap: break-word;
        color: #333;
      `;
      pre.textContent = JSON.stringify(coc, null, 2);
      rowDiv.appendChild(pre);

      jsonRowsContainer.appendChild(rowDiv);
    });

    jsonDebugDiv.style.display = "block";
  } catch (error) {
    console.error("Error generating certificate:", error);
    certResults.innerHTML = `<p style='color: red;'>Error: ${error.message}</p>`;
  }
}

// Helper function: Format inventory date (YYMMDD) to MM/DD/YYYY
function formatInventoryDate(dateStr) {
  if (!dateStr || dateStr.length !== 6) {
    return new Date().toLocaleDateString("en-US");
  }
  const yy = parseInt(dateStr.substring(0, 2));
  const mm = dateStr.substring(2, 4);
  const dd = dateStr.substring(4, 6);
  const yyyy = yy > 50 ? 1900 + yy : 2000 + yy; // Assume 1950-2049
  return `${mm}/${dd}/${yyyy}`;
}

// Helper function: Get process name from operation code
function getProcessName(operation) {
  const operationNames = {
    HEAT: "HEAT TREATMENT",
    D172: "SPOT WELD",
    FUSION: "FUSION WELD",
    D171: "FUSION WELD",
    PASSM2: "PASSIVATION",
    PASST6: "PASSIVATION",
    BLAN1: "PASSIVATION",
    FT1C1A: "SALT SPRAY",
    "23377A": "PASSIVATION",
    PAINT2: "PAINT",
  };
  return operationNames[operation] || operation || "OTHER";
}
