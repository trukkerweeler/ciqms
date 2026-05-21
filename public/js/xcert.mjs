// xcert.mjs - Certificate of Processing generation from inventory history

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

// Step 1: Fetch inventory history transactions
inventoryForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  inventoryResults.innerHTML = "";
  certResults.innerHTML = "";
  inventoryWorking.style.display = "block";

  const job = document.getElementById("job").value;
  const suffix = document.getElementById("suffix").value;

  if (!job || !suffix) {
    inventoryWorking.style.display = "none";
    inventoryResults.innerHTML = "Please enter job and suffix values.";
    return;
  }

  try {
    // Fetch inventory history from new endpoint
    const params = new URLSearchParams({
      job,
      suffix,
      codeTransaction: "J52",
    });

    const res = await fetch(`/xcert/inventory-hist?${params}`);
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to fetch inventory");
    }

    const resData = await res.json();
    currentInventoryData = resData.data || [];

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
      tdDate.textContent = row.DATE_HISTORY || "";
      tr.appendChild(tdDate);

      // Time
      const tdTime = document.createElement("td");
      tdTime.textContent = row.INV_HIST_TIME || "";
      tr.appendChild(tdTime);

      // Part
      const tdPart = document.createElement("td");
      tdPart.textContent = row.PART || "";
      tr.appendChild(tdPart);

      // Quantity
      const tdQty = document.createElement("td");
      tdQty.textContent = row.QUANTITY || "";
      tr.appendChild(tdQty);

      // Job
      const tdJob = document.createElement("td");
      tdJob.textContent = row.JOB || "";
      tr.appendChild(tdJob);

      // Suffix
      const tdSuffix = document.createElement("td");
      tdSuffix.textContent = row.SUFFIX || "";
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

// Generate certificate for selected rows (with date/time discrimination)
async function handleGenerateCert() {
  if (selectedWorkorders.size === 0) {
    certResults.innerHTML =
      "<p style='color: red;'>Please select at least one transaction.</p>";
    return;
  }

  certResults.innerHTML = "<p>Generating certificate...</p>";

  try {
    // Define the 6 special manufacturing processes (using actual operation codes from ERP)
    const processes = [
      { name: "HEAT", label: "Heat Treatment", operationCodes: ["HEAT"] },
      { name: "SWLD", label: "Spot Weld", operationCodes: ["D172"] },
      {
        name: "FWLD",
        label: "Fusion Weld",
        operationCodes: ["FUSION", "D171"],
      },
      {
        name: "PASS",
        label: "Passivation",
        operationCodes: ["PASSM2", "PASST6", "BLAN1"],
      },
      { name: "CHEM", label: "Chemical", operationCodes: ["FT1C1A"] },
      { name: "PAINT", label: "Paint", operationCodes: ["23377A", "PAINT2"] },
    ];

    // Check if testing mode (include all operations) is enabled
    const includeAllCheckbox = document.getElementById("includeAllOps");
    const includeAll = includeAllCheckbox && includeAllCheckbox.checked;

    // Use all operation codes OR empty array for testing
    const allOperationCodes = includeAll
      ? []
      : processes.flatMap((p) => p.operationCodes);

    let hasData = false;
    certResults.innerHTML = ""; // Clear loading message

    // Process each selected transaction (row)
    for (const rowIndexStr of selectedWorkorders) {
      const rowIndex = parseInt(rowIndexStr);
      const inventoryRow = currentInventoryData[rowIndex];

      if (!inventoryRow) {
        console.warn(`Could not find inventory row at index ${rowIndex}`);
        continue;
      }

      const job = inventoryRow.JOB;
      const suffix = inventoryRow.SUFFIX;
      const date = inventoryRow.DATE_HISTORY;
      const time = inventoryRow.INV_HIST_TIME;

      console.log(
        `Processing transaction: ${date} ${time} (Job: ${job}, Suffix: ${suffix})`,
      );

      // Query special process operations only
      const res = await fetch("/xcert/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseWorkorder: job,
          suffix: suffix,
          operationCodes: allOperationCodes,
        }),
      });

      if (!res.ok) {
        console.error(
          `Error processing transaction ${date} ${time}:`,
          await res.text(),
        );
        continue;
      }

      const resData = await res.json();
      const woData = resData.data || resData;

      if (!Array.isArray(woData) || woData.length === 0) {
        console.warn(`No process data for transaction ${date} ${time}`);
        continue;
      }

      hasData = true;
      currentOperationData[`${job}-${suffix}`] = woData;

      // Use PART from inventory transaction (from JOB_HEADER for the base work order)
      // This gives us the correct "Top Assembly Number" rather than mixing in child parts
      const part = inventoryRow.PART.trim();
      const partDescription = woData[0]?.PART_DESCRIPTION || "";

      // Collect unique PO numbers (vendor POs) from operations, tracking SOURCE_WO for each
      // Include any REFERENCE value that's not empty and not a known text label
      const vendorPOsMap = new Map(); // Map of PO → SOURCE_WO
      const excludedLabels = [
        "LABOR INPUT",
        "LABOR",
        "MATERIAL",
        "NONE",
        "N/A",
      ];
      woData.forEach((op) => {
        const ref = (op.REFERENCE || "").trim().toUpperCase();
        // Include if not empty and not an excluded label
        if (ref && !excludedLabels.includes(ref)) {
          const originalRef = (op.REFERENCE || "").trim();
          // Store mapping of PO to SOURCE_WO (keep first occurrence if duplicate)
          if (!vendorPOsMap.has(originalRef)) {
            vendorPOsMap.set(originalRef, op.SOURCE_WO);
          }
          console.log(
            `Added REFERENCE/PO: ${originalRef} from ${op.SOURCE_WO}`,
          );
        } else if (ref) {
          console.log(`Skipped REFERENCE (known label): ${op.REFERENCE}`);
        }
      });

      // Determine specification from operations (first outside op found)
      let specification = "";
      for (const op of woData) {
        if (operationSpecMap[op.OPERATION]) {
          specification = operationSpecMap[op.OPERATION];
          if (specification) break;
        }
      }

      // Format date as MM/DD/YYYY
      const formattedDate = formatInventoryDate(date);
      const qaUser = document.getElementById("qaUser").value || "QA User";

      // Build operations table rows (only rows with data)
      let operationsTableRows = "";
      if (vendorPOsMap.size > 0) {
        let itemNum = 1;
        vendorPOsMap.forEach((sourceWO, po) => {
          operationsTableRows += `<tr><td>${itemNum}</td><td>${part.trim()}</td><td>${po}</td><td>${inventoryRow.QUANTITY}</td><td>${sourceWO}</td></tr>`;
          itemNum++;
        });
      } else {
        // At least one row if no POs
        const baseSourceWO = woData[0]?.SOURCE_WO || `${job}-${suffix}`;
        operationsTableRows = `<tr><td>1</td><td>${part.trim()}</td><td>-</td><td>${inventoryRow.QUANTITY}</td><td>${baseSourceWO}</td></tr>`;
      }

      // Build Certificate of Processing HTML
      const certDiv = document.createElement("div");
      certDiv.className = "coc-certificate";
      certDiv.innerHTML = `
        <div class="coc-container">
          <!-- Header -->
          <div class="coc-header">
            <div class="coc-logo-section">
              <img src="images/ci-logo.png" alt="Christensen Industries" class="coc-logo" />
            </div>
            <div class="coc-company-info">
              <h1>Christensen Industries</h1>
              <p>2990 South Main Street, Salt Lake City, Utah 84115</p>
              <p>Telephone: (801) 466-3334 • Fax: (801) 466-1441</p>
            </div>
          </div>

          <h2 class="coc-title">Certification of Processing</h2>

          <!-- Work Order Information -->
          <table class="coc-info-table">
            <tr>
              <td class="coc-label">Work Order Number:</td>
              <td class="coc-value">${job}-${suffix}</td>
              <td class="coc-label">Top Assembly Number:</td>
              <td class="coc-value">${part.trim()}</td>
            </tr>
            <tr>
              <td class="coc-label">Part Number/Description:</td>
              <td class="coc-value" colspan="3">${partDescription.trim()}</td>
            </tr>
          </table>

          <!-- Process Information -->
          <table class="coc-table">
            <thead>
              <tr class="coc-process-row">
                <td colspan="5" class="coc-process-label"><strong>Process:</strong> ${getProcessName(woData[0]?.OPERATION || "OTHER")}${specification ? " - " + specification : ""}</td>
              </tr>
              <tr>
                <th>ITEM</th>
                <th>PART NUMBER / DESCRIPTION</th>
                <th>TRACE ID</th>
                <th>QUANTITY</th>
                <th>WORK ORDER</th>
              </tr>
            </thead>
            <tbody>
              ${operationsTableRows}
            </tbody>
          </table>

          <!-- Certification Statement -->
          <div class="coc-statement">
            <p>I certify that the listed materials were processed in conformance with the designated specifications and the latest drawing revisions on record.</p>
          </div>

          <!-- Signature Section -->
          <div class="coc-signature">
            <div class="signature-line">
              <div style="display: inline-block; width: 300px; border-bottom: 1px solid #000; padding-bottom: 5px;"></div>
            </div>
            <div class="signature-labels">
              <span style="display: inline-block; width: 300px; text-align: left; font-weight: bold;">${qaUser}</span>
            </div>
            <div class="signature-role">Quality Assurance</div>
            <div style="margin-top: 20px; text-align: left;">Date: ${formattedDate}</div>
          </div>

          <!-- Form Number -->
          <p class="coc-form-number">
            Form 8010-2 Rev. 01 21 May 2026 
          </p>
        </div>
      `;

      certResults.appendChild(certDiv);

      // Add page break between certificates
      const pageBreak = document.createElement("div");
      pageBreak.style.pageBreakAfter = "always";
      pageBreak.style.marginTop = "30px";
      certResults.appendChild(pageBreak);
    }

    if (!hasData) {
      certResults.innerHTML =
        "<p style='color: red;'>No certificate data found for selected transactions.</p>";
    } else {
      const printBtn = document.createElement("button");
      printBtn.textContent = "🖨️ PRINT CERTIFICATE";
      printBtn.style.marginTop = "30px";
      printBtn.style.padding = "12px 24px";
      printBtn.style.fontSize = "16px";
      printBtn.style.fontWeight = "bold";
      printBtn.style.backgroundColor = "#007bff";
      printBtn.style.color = "white";
      printBtn.style.border = "none";
      printBtn.style.borderRadius = "4px";
      printBtn.style.cursor = "pointer";
      printBtn.addEventListener("click", () => {
        window.print();
      });
      printBtn.addEventListener("mouseover", () => {
        printBtn.style.backgroundColor = "#0056b3";
      });
      printBtn.addEventListener("mouseout", () => {
        printBtn.style.backgroundColor = "#007bff";
      });
      certResults.appendChild(printBtn);
    }
  } catch (err) {
    certResults.innerHTML =
      "<p style='color: red;'>Error generating certificate: " +
      err.message +
      "</p>";
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
  const processMap = {
    HEAT: "HEAT TREATMENT",
    D172: "SPOT WELD",
    FUSION: "FUSION WELD",
    D171: "FUSION WELD",
    PASSM2: "PASSIVATION",
    PASST6: "PASSIVATION",
    FT1C1A: "CHEMICAL",
    "23377A": "PAINT",
    PAINT2: "PAINT",
    BLAN1: "PASSIVATION",
  };
  return processMap[operation] || operation || "OTHER";
}
