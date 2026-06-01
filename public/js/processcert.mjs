// processcert.mjs - Process Certificate generation from inventory history (Steps 1-3)
// Displays J52 transactions and builds chain-of-custody with process operations, router descriptions, and PO references

const inventoryForm = document.getElementById("inventory-form");
const inventoryResults = document.getElementById("inventory-results");
const inventoryWorking = document.getElementById("inventory-working");
const certResults = document.getElementById("cert-results");
const showJsonCheckbox = document.getElementById("show-json-rows");
const jsonDebugDiv = document.getElementById("json-debug");

let currentInventoryData = []; // Store the fetched inventory history
let currentServerResponse = null; // Store the full server response with all steps
let selectedTransactions = new Set(); // Track selected transaction indices

// Toggle JSON debug view when checkbox changes
showJsonCheckbox.addEventListener("change", () => {
  if (jsonDebugDiv) {
    jsonDebugDiv.style.display = showJsonCheckbox.checked ? "block" : "none";
  }
});

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

// Helper function to check if a string is a valid job reference (######-###)
function isJobReference(str) {
  if (!str || typeof str !== "string") return false;
  const trimmed = str.trim();
  const match = trimmed.match(/^(\d{6})-(\d{3})$/);
  return !!match;
}

// Extract job number and suffix from job reference string (returns both)
function extractJobInfo(str) {
  const match = str.trim().match(/^(\d{6})-(\d{3})$/);
  return match ? { job: match[1], suffix: match[2] } : null;
}

// Build unique list of all JOB/SUFFIX combinations from server response
function buildJobHierarchy(response) {
  const uniqueJobs = new Set();
  console.log("buildJobHierarchy - Input response:", response);

  // Process all CoC links
  if (response.step3_coc_links && Array.isArray(response.step3_coc_links)) {
    console.log(
      "buildJobHierarchy - Found",
      response.step3_coc_links.length,
      "CoC links",
    );
    response.step3_coc_links.forEach((coc, cocIdx) => {
      console.log(`  CoC link ${cocIdx}:`, coc);

      // Add parent_j52
      if (coc.parent_j52 && coc.parent_j52.job) {
        const job = coc.parent_j52.job.trim();
        const suffix = (coc.parent_j52.suffix || "").trim();
        const jobSuffix = `${job}-${suffix}`;
        console.log(`    Adding parent: ${jobSuffix}`);
        uniqueJobs.add(jobSuffix);
      }

      // Add child_job
      if (coc.child_job && coc.child_job.job) {
        const job = coc.child_job.job.trim();
        const suffix = (coc.child_job.suffix || "").trim();
        const jobSuffix = `${job}-${suffix}`;
        console.log(`    Adding child: ${jobSuffix}`);
        uniqueJobs.add(jobSuffix);
      }

      // Add jobs from material pulls
      if (
        coc.child_job &&
        coc.child_job.material_pulls &&
        Array.isArray(coc.child_job.material_pulls)
      ) {
        console.log(
          `    Material pulls is array with ${coc.child_job.material_pulls.length} items`,
        );
        coc.child_job.material_pulls.forEach((pull, pullIdx) => {
          console.log(`      Pull ${pullIdx}:`, pull);
          if (pull.serialNumber) {
            const sn = pull.serialNumber.trim();
            console.log(
              `        Checking SN: "${sn}", isJobRef:`,
              isJobReference(sn),
            );
            if (isJobReference(sn)) {
              const jobInfo = extractJobInfo(sn);
              if (jobInfo) {
                const jobSuffix = `${jobInfo.job}-${jobInfo.suffix}`;
                console.log(`        Adding from material pull: ${jobSuffix}`);
                uniqueJobs.add(jobSuffix);
              }
            }
          }
        });
      } else {
        console.log(
          `    Material pulls not array or missing`,
          coc.child_job?.material_pulls,
        );
      }
    });
  }

  // Convert set to sorted array of objects
  const jobList = Array.from(uniqueJobs)
    .sort()
    .map((jobSuffix) => {
      const parts = jobSuffix.split("-");
      return {
        job: parts[0],
        suffix: parts[1],
      };
    });

  console.log(
    "buildJobHierarchy - Found unique jobs:",
    Array.from(uniqueJobs),
    "Extracted:",
    jobList,
  );

  return jobList;
}

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
    currentServerResponse = resData; // Store full response
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
    table.id = "transactions-table";
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
    generateCertBtn.id = "gen-cert";
    generateCertBtn.textContent = "Generate Certificate";
    generateCertBtn.addEventListener("click", handleGenerateCert);

    // Create checkbox for unique jobs visibility (independent of fetch checkbox)
    const showJobsLabel = document.createElement("label");
    showJobsLabel.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: normal;
      margin: 0;
    `;
    const showJobsCheckbox = document.createElement("input");
    showJobsCheckbox.type = "checkbox";
    showJobsCheckbox.id = "show-unique-jobs";
    showJobsCheckbox.style.margin = "0";
    const showJobsLabel_text = document.createElement("span");
    showJobsLabel_text.textContent = "Show Unique Jobs";
    showJobsLabel.appendChild(showJobsCheckbox);
    showJobsLabel.appendChild(showJobsLabel_text);

    buttonGroup.appendChild(selectAllBtn);
    buttonGroup.appendChild(deselectAllBtn);
    buttonGroup.appendChild(generateCertBtn);
    buttonGroup.appendChild(showJobsLabel);
    inventoryResults.appendChild(buttonGroup);

    // Render JSON debug output for initial Step 1 data
    const jsonRowsContainer = document.getElementById("json-rows-container");
    jsonRowsContainer.innerHTML = "";

    // Add full server response first
    const fullResponseDiv = document.createElement("div");
    fullResponseDiv.className = "json-row-debug";
    fullResponseDiv.style.cssText = `
      margin-bottom: 20px;
      padding: 12px;
      border: 2px solid #0066cc;
      border-radius: 4px;
      background-color: #e6f2ff;
      font-family: monospace;
      font-size: 12px;
    `;

    const fullHeader = document.createElement("div");
    fullHeader.style.cssText = `
      font-weight: bold;
      margin-bottom: 8px;
      color: #0066cc;
      border-bottom: 2px solid #0066cc;
      padding-bottom: 6px;
    `;
    fullHeader.textContent = `Full Server Response (Complete JSON)`;
    fullResponseDiv.appendChild(fullHeader);

    const fullPre = document.createElement("pre");
    fullPre.style.cssText = `
      margin: 0;
      overflow-x: auto;
      white-space: pre-wrap;
      word-wrap: break-word;
      color: #333;
    `;
    fullPre.textContent = JSON.stringify(currentServerResponse, null, 2);
    fullResponseDiv.appendChild(fullPre);
    jsonRowsContainer.appendChild(fullResponseDiv);

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

    // Show/hide JSON debug view based on checkbox
    jsonDebugDiv.style.display = showJsonCheckbox.checked ? "block" : "none";
  } catch (error) {
    console.error("Error fetching transactions:", error);
    inventoryResults.innerHTML = `<p style='color: red;'>Error: ${error.message}</p>`;
  } finally {
    inventoryWorking.style.display = "none";
  }
});

// Fetch job operation details for a specific job/suffix
async function fetchJobDetails(job, suffix) {
  try {
    const params = new URLSearchParams({ job, suffix });
    const url = `/processcert/processcert-detail?${params}`;
    console.log(`Fetching job details: ${url}`);
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Failed to fetch details for ${job}-${suffix}`);
      return null;
    }
    const data = await res.json();
    console.log(`Received for ${job}-${suffix}:`, data);
    return data;
  } catch (error) {
    console.error(`Error fetching details for ${job}-${suffix}:`, error);
    return null;
  }
}

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

    // Fetch and display job operation details for each unique job
    console.log("About to call buildJobHierarchy with cocData:", cocData);
    console.log("cocData.step3_coc_links:", cocData.step3_coc_links);

    // DEBUG: Write to page
    let debugHtml =
      "<div style='background: yellow; padding: 10px; margin-top: 20px;'><strong>DEBUG:</strong><br>";
    debugHtml += `step3_coc_links length: ${cocData.step3_coc_links?.length}<br>`;
    if (cocData.step3_coc_links && cocData.step3_coc_links.length > 0) {
      debugHtml += `First link material_pulls type: ${typeof cocData.step3_coc_links[0].child_job?.material_pulls}<br>`;
      debugHtml += `First link material_pulls length: ${cocData.step3_coc_links[0].child_job?.material_pulls?.length}<br>`;
      if (cocData.step3_coc_links[0].child_job?.material_pulls?.length > 0) {
        debugHtml += `First pull SN: "${cocData.step3_coc_links[0].child_job.material_pulls[0].serialNumber}"<br>`;
      }
    }
    debugHtml += "</div>";
    certResults.innerHTML += debugHtml;

    const jobHierarchy = buildJobHierarchy(cocData);

    // DEBUG: Show extracted jobs
    debugHtml =
      "<div style='background: lightblue; padding: 10px; margin-top: 20px;'><strong>EXTRACTED JOBS:</strong><br>";
    debugHtml += `Total jobs: ${jobHierarchy.length}<br>`;
    jobHierarchy.forEach((j) => {
      debugHtml += `- ${j.job}-${j.suffix}<br>`;
    });
    debugHtml += "</div>";
    certResults.innerHTML += debugHtml;

    if (jobHierarchy.length > 0) {
      // Add a section for job details
      const jobDetailsHtml = document.createElement("div");
      jobDetailsHtml.style.marginTop = "30px";

      const jobDetailsTitle = document.createElement("h3");
      jobDetailsTitle.textContent = "Job Operation Details";
      jobDetailsHtml.appendChild(jobDetailsTitle);

      // Create a container for job detail tables
      const jobDetailsContainer = document.createElement("div");
      jobDetailsHtml.appendChild(jobDetailsContainer);
      certResults.appendChild(jobDetailsHtml);

      // Fetch details for each unique job - use Promise.all to wait for all
      const jobDetailPromises = jobHierarchy.map(async (jobEntry) => {
        const detailData = await fetchJobDetails(jobEntry.job, jobEntry.suffix);

        // Create table regardless of row count (show "no data" if empty)
        if (detailData) {
          // Add a heading for this job
          const jobHeading = document.createElement("h4");
          jobHeading.style.cssText = "margin-top: 20px; margin-bottom: 10px;";
          jobHeading.textContent = `Job ${jobEntry.job}-${jobEntry.suffix}`;
          jobDetailsContainer.appendChild(jobHeading);

          if (detailData.rows && detailData.rows.length > 0) {
            // Create data table
            const jobTable = document.createElement("table");
            jobTable.style.cssText = `
              margin-bottom: 20px;
              width: 100%;
              border-collapse: collapse;
              border: 1px solid #ddd;
            `;

            // Add header
            jobTable.innerHTML = `
              <thead>
                <tr style="background-color: #f5f5f5;">
                  <th style="border: 1px solid #ddd; padding: 8px;">Job</th>
                  <th style="border: 1px solid #ddd; padding: 8px;">Suffix</th>
                  <th style="border: 1px solid #ddd; padding: 8px;">Seq</th>
                  <th style="border: 1px solid #ddd; padding: 8px;">Operation</th>
                  <th style="border: 1px solid #ddd; padding: 8px;">Description</th>
                  <th style="border: 1px solid #ddd; padding: 8px;">Units Open</th>
                  <th style="border: 1px solid #ddd; padding: 8px;">Complete</th>
                  <th style="border: 1px solid #ddd; padding: 8px;">Scrap</th>
                  <th style="border: 1px solid #ddd; padding: 8px;">Serial #</th>
                  <th style="border: 1px solid #ddd; padding: 8px;">Code</th>
                  <th style="border: 1px solid #ddd; padding: 8px;">Qty</th>
                  <th style="border: 1px solid #ddd; padding: 8px;">Date</th>
                </tr>
              </thead>
              <tbody></tbody>
            `;

            // Add data rows
            const tbody = jobTable.querySelector("tbody");
            detailData.rows.forEach((row) => {
              // Filter serialNumber: remove 'LABOR INPUT' and 'PO: ' prefix
              let displaySerialNumber = row.serialNumber || "";
              if (displaySerialNumber.trim() === "LABOR INPUT") {
                displaySerialNumber = "";
              } else if (displaySerialNumber.startsWith("PO: ")) {
                displaySerialNumber = displaySerialNumber.substring(4);
              }

              const tr = document.createElement("tr");
              tr.innerHTML = `
                <td style="border: 1px solid #ddd; padding: 8px;">${row.job}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${row.suffix}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${row.operationSeq}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${row.operation}</td>
                <td style="border: 1px solid #ddd; padding: 8px; font-size: 11px;">${row.operationDescription}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${row.unitsOpen}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${row.unitsComplete}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${row.unitsScrap}</td>
                <td style="border: 1px solid #ddd; padding: 8px; font-size: 11px;">${displaySerialNumber}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${row.codeTransaction}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${row.quantity}</td>
                <td style="border: 1px solid #ddd; padding: 8px; font-size: 11px;">${row.dateHistory} ${row.timeItemHistory}</td>
              `;
              tbody.appendChild(tr);
            });

            jobDetailsContainer.appendChild(jobTable);
          } else {
            // No operations found for this job
            const noDataMsg = document.createElement("p");
            noDataMsg.style.cssText = "color: #999; font-style: italic;";
            noDataMsg.textContent = "No job operations found in database";
            jobDetailsContainer.appendChild(noDataMsg);
          }
        }
      });

      // Wait for all job detail fetches to complete
      await Promise.all(jobDetailPromises);
    }

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

    // Extract and display job hierarchy for selected transactions (only if checkbox is checked)
    const showUniqueJobsCheckbox = document.getElementById("show-unique-jobs");
    if (showUniqueJobsCheckbox && showUniqueJobsCheckbox.checked) {
      const jobHierarchy = buildJobHierarchy(cocData);
      const jobHierarchyDiv = document.createElement("div");
      jobHierarchyDiv.className = "json-row-debug";
      jobHierarchyDiv.style.cssText = `
        margin-bottom: 20px;
        padding: 12px;
        border: 2px solid #cc6600;
        border-radius: 4px;
        background-color: #ffe6cc;
        font-family: monospace;
        font-size: 12px;
      `;

      const jobHeader = document.createElement("div");
      jobHeader.style.cssText = `
        font-weight: bold;
        margin-bottom: 8px;
        color: #cc6600;
        border-bottom: 2px solid #cc6600;
        padding-bottom: 6px;
      `;
      jobHeader.textContent = `Unique Jobs (from Selection)`;
      jobHierarchyDiv.appendChild(jobHeader);

      const jobPre = document.createElement("pre");
      jobPre.style.cssText = `
        margin: 0;
        overflow-x: auto;
        white-space: pre-wrap;
        word-wrap: break-word;
        color: #333;
      `;
      jobPre.textContent = JSON.stringify(jobHierarchy, null, 2);
      jobHierarchyDiv.appendChild(jobPre);
      jsonRowsContainer.appendChild(jobHierarchyDiv);
    }

    // Show/hide JSON debug view if either checkbox is checked
    const shouldShowDebug =
      showJsonCheckbox.checked ||
      (showUniqueJobsCheckbox && showUniqueJobsCheckbox.checked);
    jsonDebugDiv.style.display = shouldShowDebug ? "block" : "none";
  } catch (error) {
    console.error("Error generating certificate:", error);
    certResults.innerHTML = `<p style='color: red;'>Error: ${error.message}</p>`;
  }
}
