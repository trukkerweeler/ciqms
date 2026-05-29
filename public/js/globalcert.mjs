// globalcert.mjs - Certificate of Processing generation from inventory history

// Helper function: Recursively trim serialNumber fields from objects
function trimSerialNumbers(obj) {
  if (!obj) return obj;
  if (typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => trimSerialNumbers(item));
  }

  const trimmed = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (key === "serialNumber" && typeof obj[key] === "string") {
        trimmed[key] = obj[key].trim();
      } else if (typeof obj[key] === "object") {
        trimmed[key] = trimSerialNumbers(obj[key]);
      } else {
        trimmed[key] = obj[key];
      }
    }
  }
  return trimmed;
}

// Validation: Check if a string matches valid job reference pattern (######-###)
function isValidJobReference(serialNumber) {
  if (!serialNumber || typeof serialNumber !== "string") return false;
  const trimmed = serialNumber.trim();
  // Pattern: 6 digits, dash, 3 digits (e.g., "122166-001")
  const jobPattern = /^\d{6}-\d{3}$/;
  return jobPattern.test(trimmed);
}

// Recursively fetch and build nested child job data
async function buildNestedCoC(job, suffix, visitedJobs) {
  const jobKey = `${job}-${suffix}`;

  // Infinite loop protection
  if (visitedJobs.has(jobKey)) {
    return null;
  }
  visitedJobs.add(jobKey);

  try {
    // Fetch Step 1 J52 transactions for this job
    const params = new URLSearchParams({ job });
    const res = await fetch(`/globalcert/processcert-coc?${params}`);

    if (!res.ok) return null;
    const data = await res.json();

    const step1Transactions = data.step1_j52_transactions || [];
    const step3Links = data.step3_coc_links || [];

    // For each step3 link, recursively process material pulls' serialNumbers
    for (const coc of step3Links) {
      const materialPulls = coc.child_job?.material_pulls || [];
      const nestedChildren = [];

      // Check each material pull's serialNumber for job references
      for (const pull of materialPulls) {
        const serialNumber = (pull.serialNumber || "").trim();

        // Check if serialNumber is a valid job reference
        if (isValidJobReference(serialNumber)) {
          const [childJob, childSuffix] = serialNumber.split("-");
          const jobKey = `${childJob}-${childSuffix}`;

          if (!visitedJobs.has(jobKey)) {
            const nestedData = await buildNestedCoC(
              childJob,
              childSuffix,
              visitedJobs,
            );
            if (nestedData) {
              nestedChildren.push(nestedData);
            }
          }
        }
      }

      // Attach nested children to this CoC link
      if (nestedChildren.length > 0) {
        coc.nested_children = nestedChildren;
      }
    }

    return {
      job,
      suffix,
      step1_j52_transactions: step1Transactions,
      step3_coc_links: step3Links,
    };
  } catch (error) {
    console.error(`Error building nested CoC for job ${jobKey}:`, error);
    return null;
  }
}

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
      pre.textContent = JSON.stringify(trimSerialNumbers(coc), null, 2);
      rowDiv.appendChild(pre);

      jsonRowsContainer.appendChild(rowDiv);
    });

    jsonDebugDiv.style.display = "none"; // Debug view hidden for now

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

  certResults.innerHTML =
    "<p>Generating certificate with recursive CoC resolution...</p>";

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

    let cocLinks = cocData.step3_coc_links || [];
    if (cocLinks.length === 0) {
      certResults.innerHTML = "<p>No chain-of-custody data generated.</p>";
      return;
    }

    // CONTROLLED RECURSION: Only recurse on selected Step 1 rows
    // Build a visitedJobs Set to prevent infinite loops
    const visitedJobs = new Set([`${job}`]);

    console.log("🔄 Starting recursion on material pull serialNumbers...");

    // For each CoC link from selected rows, check material pulls' serialNumbers for nested jobs
    for (const coc of cocLinks) {
      const materialPulls = coc.child_job?.material_pulls || [];
      const nestedChildren = [];

      console.log(
        `  Processing CoC: ${coc.parent_j52?.job}-${coc.parent_j52?.suffix} → ${coc.child_job?.job}-${coc.child_job?.suffix}, Material pulls: ${materialPulls.length}`,
      );

      // Check each material pull's serialNumber for job references
      for (const pull of materialPulls) {
        const serialNumber = (pull.serialNumber || "").trim();

        console.log(
          `    Checking material pull serialNumber: "${serialNumber}"`,
        );

        // Check if serialNumber is a valid job reference (######-###)
        if (isValidJobReference(serialNumber)) {
          const [childJob, childSuffix] = serialNumber.split("-");
          const jobKey = `${childJob}-${childSuffix}`;

          console.log(`    ✓ Found valid job reference: ${serialNumber}`);

          // Check infinite loop protection
          if (!visitedJobs.has(jobKey)) {
            console.log(`      Recursing into ${jobKey}...`);
            const nestedData = await buildNestedCoC(
              childJob,
              childSuffix,
              visitedJobs,
            );
            if (nestedData) {
              console.log(`      ✓ Got nested data for ${jobKey}`);
              nestedChildren.push(nestedData);
            }
          } else {
            console.log(`      ⚠ ${jobKey} already visited, skipping`);
          }
        } else {
          console.log(`    ✗ Not a job reference: "${serialNumber}"`);
        }
      }

      // Attach nested children to this CoC link if any found
      if (nestedChildren.length > 0) {
        console.log(
          `  ✓ Attached ${nestedChildren.length} nested children to CoC`,
        );
        coc.nested_children = nestedChildren;
      }
    }

    // Display CoC data with hierarchical sub-tables
    let html =
      "<h3>Chain of Custody - Generated from Steps 1-3 (with Recursive Resolution)</h3>";

    // Recursive function to build nested table HTML
    function buildCoCTablesHtml(cocArray, depth = 0) {
      let tableHtml = "";

      // Add level title and styling
      if (depth === 0) {
        tableHtml += "<div class='coc-level-0' style='padding: 10px 0;'>";
        tableHtml += "<h4 style='margin-top: 0;'>Top Level CoC Links</h4>";
      } else {
        tableHtml += `<div class='coc-level-${depth}' style='margin-left: ${depth * 30}px; padding: 15px; background-color: #f${(9 - depth).toString(16)}f${(9 - depth).toString(16)}f${(9 - depth).toString(16)}; border-left: 4px solid #999; margin-top: 20px;'>`;
        tableHtml += `<h4 style='margin-top: 0;'>Nested Level ${depth} - Child Job CoC</h4>`;
      }

      // Build table for this level
      tableHtml +=
        "<table class='coc-table' style='width: 100%; border-collapse: collapse;'><thead><tr>";
      tableHtml +=
        "<th>Parent Job</th><th>Parent Suffix</th><th>Operation</th><th>Router</th>";
      tableHtml +=
        "<th>Child Job</th><th>Child Suffix</th><th>Child Part</th><th>Material Pulls</th>";
      tableHtml += "</tr></thead><tbody>";

      cocArray.forEach((coc) => {
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

        tableHtml += `<tr>
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

      tableHtml += "</tbody></table>";

      // Recursively add nested children tables
      cocArray.forEach((coc) => {
        if (coc.nested_children && coc.nested_children.length > 0) {
          coc.nested_children.forEach((nestedJob) => {
            const nestedCocLinks = nestedJob.step3_coc_links || [];
            if (nestedCocLinks.length > 0) {
              tableHtml += buildCoCTablesHtml(nestedCocLinks, depth + 1);
            }
          });
        }
      });

      tableHtml += "</div>";
      return tableHtml;
    }

    html += buildCoCTablesHtml(cocLinks);
    certResults.innerHTML = html;

    // Render JSON debug output for each CoC link (including nested)
    const jsonDebugDiv = document.getElementById("json-debug");
    const jsonRowsContainer = document.getElementById("json-rows-container");
    jsonRowsContainer.innerHTML = "";

    const debugTitle = document.createElement("h3");
    debugTitle.textContent =
      "Raw CoC JSON Data with Recursive Children (Debug View)";
    jsonRowsContainer.appendChild(debugTitle);

    // Recursive function to render nested CoC links
    function renderCoCJson(cocArray, depth = 0) {
      cocArray.forEach((coc, index) => {
        const rowDiv = document.createElement("div");
        rowDiv.className = "json-row-debug";
        rowDiv.style.cssText = `
          margin-bottom: 20px;
          margin-left: ${depth * 20}px;
          padding: 12px;
          border: 1px solid #ddd;
          border-left: 4px solid ${depth === 0 ? "#333" : "#999"};
          border-radius: 4px;
          background-color: ${depth === 0 ? "#f9f9f9" : "#f0f0f0"};
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
        const depthLabel = depth > 0 ? ` [NESTED LEVEL ${depth}]` : "";
        header.textContent = `CoC Link ${index}: ${parentJ52.job}-${parentJ52.suffix} → ${childJob.job}-${childJob.suffix}${depthLabel}`;
        rowDiv.appendChild(header);

        const pre = document.createElement("pre");
        pre.style.cssText = `
          margin: 0;
          overflow-x: auto;
          white-space: pre-wrap;
          word-wrap: break-word;
          color: #333;
        `;
        pre.textContent = JSON.stringify(trimSerialNumbers(coc), null, 2);
        rowDiv.appendChild(pre);

        jsonRowsContainer.appendChild(rowDiv);

        // Recursively render nested children
        if (coc.nested_children && coc.nested_children.length > 0) {
          coc.nested_children.forEach((nestedJob) => {
            renderCoCJson(nestedJob.step3_coc_links || [], depth + 1);
          });
        }
      });
    }

    renderCoCJson(cocLinks);

    jsonDebugDiv.style.display = "none"; // Debug view hidden for now
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
