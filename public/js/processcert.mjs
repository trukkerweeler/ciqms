// processcert.mjs - Process Certificate generation from inventory history (Steps 1-3)
// Displays J52 transactions and builds chain-of-custody with process operations, router descriptions, and PO references

const inventoryForm = document.getElementById("inventory-form");
const inventoryResults = document.getElementById("inventory-results");
const inventoryWorking = document.getElementById("inventory-working");
const certResults = document.getElementById("cert-results");

let currentInventoryData = []; // Store the fetched inventory history
let selectedTransactions = new Set(); // Track selected transaction indices

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

// Step 1: Fetch inventory history transactions (J52) for the given job
inventoryForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  inventoryResults.innerHTML = "";
  certResults.innerHTML = "";
  selectedTransactions.clear();
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
    const res = await fetch(`/processcert/processcert-coc?${params}`);

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to fetch transactions");
    }

    const resData = await res.json();
    currentInventoryData = resData.step1_j52_transactions || [];

    if (
      !Array.isArray(currentInventoryData) ||
      currentInventoryData.length === 0
    ) {
      inventoryResults.innerHTML =
        "<p>No process transactions (J52) found for the specified job.</p>";
      inventoryWorking.style.display = "none";
      return;
    }

    // Display inventory transactions in a table with checkboxes
    const table = document.createElement("table");
    table.className = "inventory-table";
    table.style.width = "100%"; // Full width table
    table.innerHTML = `<thead><tr>
      <th style="width: 40px;">Select</th>
      <th>Date</th>
      <th>Time</th>
      <th>Part</th>
      <th>Quantity</th>
      <th>Job</th>
      <th>Suffix</th>
      <th>Serial Number</th>
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
          selectedTransactions.add(rowId);
          tr.classList.add("selected");
        } else {
          selectedTransactions.delete(rowId);
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

      // Serial Number
      const tdSerial = document.createElement("td");
      tdSerial.textContent = (row.serialNumber || "").trim();
      tr.appendChild(tdSerial);

      table.querySelector("tbody").appendChild(tr);
    });

    // Auto-select single row if only one transaction
    if (currentInventoryData.length === 1) {
      const checkbox = table.querySelector(".row-checkbox");
      checkbox.checked = true;
      const rowId = checkbox.value;
      selectedTransactions.add(rowId);
      checkbox.closest("tr").classList.add("selected");
    }

    inventoryResults.innerHTML =
      "<h3>Process Transactions (J52) - Select rows to include in certificate:</h3>";
    inventoryResults.style.width = "100%";
    inventoryResults.style.overflowX = "auto";
    inventoryResults.appendChild(table);

    // Add button group below table
    const buttonGroup = document.createElement("div");
    buttonGroup.className = "button-group";
    buttonGroup.style.marginBottom = "20px";
    buttonGroup.style.display = "flex";
    buttonGroup.style.gap = "10px";

    const selectAllBtn = document.createElement("button");
    selectAllBtn.type = "button";
    selectAllBtn.textContent = "Select All";
    selectAllBtn.addEventListener("click", () => {
      const checkboxes = table.querySelectorAll(".row-checkbox");
      checkboxes.forEach((cb) => {
        if (!cb.checked) {
          cb.checked = true;
          selectedTransactions.add(cb.value);
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
          selectedTransactions.delete(cb.value);
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

    // Render JSON debug output for initial Step 1 data
    const jsonDebugDiv = document.getElementById("json-debug");
    const jsonRowsContainer = document.getElementById("json-rows-container");
    jsonRowsContainer.innerHTML = "";

    const debugTitle = document.createElement("h3");
    debugTitle.textContent = "Raw Step 1 Data (Debug View)";
    jsonRowsContainer.appendChild(debugTitle);

    currentInventoryData.forEach((row, index) => {
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
      header.textContent = `Transaction ${index}: ${row.job}-${row.suffix} (${row.dateHistory})`;
      rowDiv.appendChild(header);

      const pre = document.createElement("pre");
      pre.style.cssText = `
        margin: 0;
        overflow-x: auto;
        white-space: pre-wrap;
        word-wrap: break-word;
        color: #333;
      `;
      pre.textContent = JSON.stringify(row, null, 2);
      rowDiv.appendChild(pre);

      jsonRowsContainer.appendChild(rowDiv);
    });

    jsonDebugDiv.style.display = "none"; // Debug view hidden for now
  } catch (error) {
    console.error("Error fetching transactions:", error);
    inventoryResults.innerHTML = `<p style='color: red;'>Error: ${error.message}</p>`;
  } finally {
    inventoryWorking.style.display = "none";
  }
});

// Step 3: Generate certificate for selected rows (Chain of Custody)
async function handleGenerateCert() {
  if (selectedTransactions.size === 0) {
    certResults.innerHTML =
      "<p style='color: red;'>Please select at least one transaction.</p>";
    return;
  }

  certResults.innerHTML =
    "<p>Generating process certificate with chain-of-custody...</p>";

  try {
    // Get the job number from the first inventory row
    const job = currentInventoryData[0]?.job;
    if (!job) {
      certResults.innerHTML = "<p style='color: red;'>No job found.</p>";
      return;
    }

    // Convert selectedTransactions Set to comma-separated string of indices
    const selectedIndicesStr = Array.from(selectedTransactions)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .join(",");

    // Call processcert-coc with selectedIndices to get Steps 1-3 complete data
    const params = new URLSearchParams({
      job,
      selectedIndices: selectedIndicesStr,
    });

    const res = await fetch(`/processcert/processcert-coc?${params}`);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to generate certificate");
    }

    const cocData = await res.json();
    if (!cocData.success) {
      throw new Error("Certificate generation failed");
    }

    let cocLinks = cocData.step3_coc_links || [];
    if (cocLinks.length === 0) {
      certResults.innerHTML = "<p>No chain-of-custody data generated.</p>";
      return;
    }

    // Display CoC data in table format
    let html = "<h3>Process Certificate - Chain of Custody (Steps 1-3)</h3>";
    html += "<table class='cert-table' style='margin-top: 20px;'>";
    html +=
      "<thead><tr><th>Parent Job</th><th>Operation</th><th>Router Desc</th><th>Outside Proc</th><th>PO Number</th><th>Child Job</th><th>Material Pulls</th></tr></thead>";
    html += "<tbody>";

    cocLinks.forEach((coc, index) => {
      const parentJ52 = coc.parent_j52 || {};
      const op = coc.operation || {};
      const childJob = coc.child_job || {};
      const childHeader = childJob.header || {};
      const materialPulls = childJob.material_pulls || [];

      // Build material pulls list
      let pullsHtml = "<ul style='margin: 0; padding-left: 20px;'>";
      if (materialPulls.length > 0) {
        materialPulls.forEach((pull) => {
          pullsHtml += `<li>${pull.codeTransaction}: ${(pull.part || "").trim()} (Qty: ${pull.quantity})`;
          if (pull.serialNumber && pull.serialNumber.trim()) {
            pullsHtml += ` [SN: ${pull.serialNumber.trim()}]`;
          }
          pullsHtml += `</li>`;
        });
      } else {
        pullsHtml += "<li>None</li>";
      }
      pullsHtml += "</ul>";

      const outside = op.outside ? "Yes" : "No";

      html += `<tr>
        <td>${parentJ52.job || ""}-${parentJ52.suffix || ""}</td>
        <td>${op.operation || "N/A"}</td>
        <td>${(op.router_desc || "").trim()}</td>
        <td>${outside}</td>
        <td>${op.po_number || ""}</td>
        <td>${childJob.job || ""}-${childJob.suffix || ""}</td>
        <td>${pullsHtml}</td>
      </tr>`;
    });

    html += "</tbody></table>";

    // Add summary info
    html += `<div style="margin-top: 20px; padding: 10px; background-color: #f0f0f0; border-radius: 4px;">
      <p><strong>Certificate Summary:</strong></p>
      <p>Selected Transactions: ${selectedTransactions.size}</p>
      <p>Chain-of-Custody Links: ${cocLinks.length}</p>
    </div>`;

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

    jsonDebugDiv.style.display = "none"; // Debug view hidden for now
  } catch (error) {
    console.error("Error generating certificate:", error);
    certResults.innerHTML = `<p style='color: red;'>Error: ${error.message}</p>`;
  }
}
