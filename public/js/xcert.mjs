// xcert.mjs - Frontend logic for xcert.html with inventory history support

const inventoryForm = document.getElementById("inventory-form");
const inventoryResults = document.getElementById("inventory-results");
const inventoryWorking = document.getElementById("inventory-working");
const certResults = document.getElementById("cert-results");

let currentInventoryData = []; // Store the fetched inventory history
let selectedWorkorders = new Set(); // Track selected work orders (with date/time discrimination)

// Step 1: Fetch inventory history transactions
inventoryForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  inventoryResults.innerHTML = "";
  certResults.innerHTML = "";
  inventoryWorking.style.display = "block";

  const job = document.getElementById("job").value;
  const suffix = document.getElementById("suffix").value;
  const codeTransaction = document.getElementById("codeTransaction").value;

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
      codeTransaction: codeTransaction || "J52",
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
    // Define the 6 special manufacturing processes (from ACERT)
    const processes = [
      { name: "HEAT", label: "Heat Treatment", operationCodes: ["6061"] },
      { name: "SWLD", label: "Spot Weld", operationCodes: ["D172"] },
      {
        name: "FWLD",
        label: "Fusion Weld",
        operationCodes: ["FUSION", "D171"],
      },
      {
        name: "PASS",
        label: "Passivation",
        operationCodes: ["PASSM2", "PASST6"],
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

      // Build HTML for this transaction
      const transactionHeading = document.createElement("h3");
      transactionHeading.textContent = `Certificate: Job ${job}-${suffix} | Transaction: ${date} ${time} | Part: ${inventoryRow.PART} | Qty: ${inventoryRow.QUANTITY}`;
      certResults.appendChild(transactionHeading);

      // Group operations by SOURCE_WO (base vs children)
      const groupedByWO = {};
      woData.forEach((row) => {
        const sourceWO = row.SOURCE_WO || "Unknown";
        if (!groupedByWO[sourceWO]) {
          groupedByWO[sourceWO] = [];
        }
        groupedByWO[sourceWO].push(row);
      });

      // Display operations with PO numbers highlighted (filter to outside operations)
      const table = document.createElement("table");
      table.style.width = "100%";
      table.innerHTML = `<thead><tr><th>#</th><th>From Job/Suffix</th><th>Operation</th><th>Router Seq</th><th>Description</th><th>PO (Reference)</th><th>Date Completed</th><th>Units Complete</th></tr></thead><tbody></tbody>`;

      const tbody = table.querySelector("tbody");
      let opNumber = 0;

      // Display all operations in order by work order (with highlighting for operations with POs)
      for (const woName in groupedByWO) {
        const woOps = groupedByWO[woName];
        woOps.forEach((row) => {
          opNumber++;
          const tr = document.createElement("tr");

          // Highlight rows with PO (outside operations)
          // Check if REFERENCE is a PO number (all digits) vs text like "LABOR INPUT"
          const isPO = /^\d+$/.test((row.REFERENCE || "").trim());
          if (isPO) {
            tr.style.backgroundColor = "#fff8e1"; // Light yellow for operations with actual PO numbers
          }

          // #
          const tdNum = document.createElement("td");
          tdNum.textContent = opNumber;
          tr.appendChild(tdNum);

          // From Job/Suffix (SOURCE_WO)
          const tdSource = document.createElement("td");
          tdSource.textContent = row.SOURCE_WO || "Unknown";
          tdSource.style.fontWeight = "bold";
          tr.appendChild(tdSource);

          // Operation
          const tdOp = document.createElement("td");
          tdOp.textContent = row.OPERATION || "";
          tr.appendChild(tdOp);

          // Router Seq (identifies outside ops: not divisible by 100)
          const tdRouterSeq = document.createElement("td");
          tdRouterSeq.textContent = row.ROUTER_SEQ || "";
          if (row.ROUTER_SEQ && parseInt(row.ROUTER_SEQ) % 100 !== 0) {
            tdRouterSeq.style.backgroundColor = "#ffffcc"; // Highlight outside ops
          }
          tr.appendChild(tdRouterSeq);

          // Description
          const tdDesc = document.createElement("td");
          tdDesc.textContent = row.DESC_RT_LINE || "";
          tr.appendChild(tdDesc);

          // PO (Reference from job detail)
          const tdRef = document.createElement("td");
          tdRef.textContent = row.REFERENCE || "";
          if (isPO) {
            tdRef.style.fontWeight = "bold";
            tdRef.style.color = "#0066cc";
          }
          tr.appendChild(tdRef);

          // Date Completed
          const tdDate = document.createElement("td");
          tdDate.textContent = row.DATE_COMPLETED || "";
          tr.appendChild(tdDate);

          // Units Complete
          const tdUnits = document.createElement("td");
          tdUnits.textContent = row.UNITS_COMPLETE || "";
          tr.appendChild(tdUnits);

          tbody.appendChild(tr);
        });
      }

      certResults.appendChild(table);

      // Add page break between transactions
      const pageBreak = document.createElement("div");
      pageBreak.style.pageBreakAfter = "always";
      pageBreak.style.marginTop = "20px";
      certResults.appendChild(pageBreak);
    }

    if (!hasData) {
      certResults.innerHTML =
        "<p style='color: red;'>No certificate data found for selected transactions.</p>";
    } else {
      const printBtn = document.createElement("button");
      printBtn.textContent = "Print Certificate";
      printBtn.style.marginTop = "20px";
      printBtn.addEventListener("click", () => {
        window.print();
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
