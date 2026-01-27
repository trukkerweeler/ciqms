import { myport } from "./utils.mjs";

const port = myport() || 3003;

// ========== REVISION TRACKING HELPERS ==========
let currentWoNo = "";
let currentRevisionData = {};
let currentAddSection = "";

// ========== SECTION FORM FIELDS CONFIGURATION ==========
const sectionFormFields = {
  MATERIAL: [
    { name: "job", label: "Item", type: "text", required: true },
    { name: "part2", label: "Part Number", type: "text", required: true },
    { name: "serialNumber", label: "Trace ID", type: "text", required: true },
  ],
  CHEM: [
    { name: "job", label: "Item", type: "text", required: true },
    { name: "part", label: "Part Number", type: "text", required: true },
    { name: "operation", label: "Specification", type: "text", required: true },
    { name: "serialNumber", label: "Trace ID", type: "text", required: false },
  ],
  FWELD: [
    { name: "job", label: "Item", type: "text", required: true },
    { name: "part", label: "Part Number", type: "text", required: true },
    { name: "operation", label: "Specification", type: "text", required: true },
    { name: "serialNumber", label: "Trace ID", type: "text", required: false },
  ],
  SWELD: [
    { name: "job", label: "Item", type: "text", required: true },
    { name: "part", label: "Part Number", type: "text", required: true },
    { name: "operation", label: "Specification", type: "text", required: true },
    { name: "serialNumber", label: "Trace ID", type: "text", required: false },
  ],
  HEAT: [
    { name: "job", label: "Item", type: "text", required: true },
    { name: "part", label: "Part Number", type: "text", required: true },
    { name: "operation", label: "Specification", type: "text", required: true },
    { name: "serialNumber", label: "Trace ID", type: "text", required: false },
  ],
  PASS: [
    { name: "job", label: "Item", type: "text", required: true },
    { name: "part", label: "Part Number", type: "text", required: true },
    { name: "operation", label: "Specification", type: "text", required: true },
    { name: "serialNumber", label: "Trace ID", type: "text", required: false },
  ],
  PAINT: [
    { name: "job", label: "Item", type: "text", required: true },
    { name: "part", label: "Part Number", type: "text", required: true },
    { name: "operation", label: "Specification", type: "text", required: true },
    { name: "serialNumber", label: "Trace ID", type: "text", required: false },
  ],
};

// ========== OPTIMIZED ENDPOINT-BASED DATA FETCHING ==========
/**
 * Fetch certification data for all processes using optimized endpoints
 * Each process queries the database once via its dedicated endpoint
 */
async function fetchCertDataOptimized(woNumber) {
  const endpoints = [
    { key: "MATERIAL", url: null }, // MATERIAL doesn't have an endpoint yet
    { key: "CHEM", url: `/cert-chem?baseWorkorder=${woNumber}` },
    { key: "FWELD", url: `/cert-fweld?baseWorkorder=${woNumber}` },
    { key: "SWELD", url: `/cert-sweld?baseWorkorder=${woNumber}` },
    { key: "HEAT", url: `/cert-heat?baseWorkorder=${woNumber}` },
    { key: "PASS", url: `/xcert?baseWorkorder=${woNumber}` },
    { key: "PAINT", url: `/cert-paint?baseWorkorder=${woNumber}` },
  ];

  const categorized = {};

  for (const ep of endpoints) {
    if (!ep.url) continue; // Skip MATERIAL for now
    try {
      const res = await fetch(ep.url);
      if (res.ok) {
        const data = await res.json();
        // Transform endpoint data to cert.mjs format
        // Endpoints return: ROUTER, JOB, SUFFIX, REFERENCE, DATE_COMPLETED
        // cert.mjs expects: PART, JOB, SUFFIX, OPERATION, SERIAL_NUMBER, DATE_COMPLETED, etc.
        const transformed = Array.isArray(data)
          ? data.map((row) => ({
              PART: row.ROUTER || "",
              JOB: row.JOB || "",
              SUFFIX: row.SUFFIX || "",
              OPERATION: row.DESCRIPTION || "",
              OPERATION_CODE: row.OPERATION || "",
              SERIAL_NUMBER: row.REFERENCE || "",
              DATE_COMPLETED: row.DATE_COMPLETED || "",
              REFERENCE: row.REFERENCE || "",
            }))
          : [];
        categorized[ep.key] = transformed;
      } else {
        categorized[ep.key] = [];
      }
    } catch (err) {
      console.error(`Error fetching ${ep.key} data:`, err);
      categorized[ep.key] = [];
    }
  }

  return { categorized, raw: [] };
}

// ========== HELPER FUNCTIONS ==========
/**
 * Format part numbers by removing trailing version codes
 */
function formatPartNumber(part) {
  if (!part) return "";
  const trimmed = part.trim();
  const lastSpaceIndex = trimmed.lastIndexOf(" ");

  if (lastSpaceIndex === -1) return trimmed;

  const lastCharIndex = trimmed.length - 1;
  if (
    lastSpaceIndex === lastCharIndex - 1 ||
    lastSpaceIndex === lastCharIndex - 2
  ) {
    return trimmed.substring(0, lastSpaceIndex);
  }

  if (trimmed.indexOf(" ") !== lastSpaceIndex) {
    return trimmed.substring(0, lastSpaceIndex);
  }

  return trimmed;
}

/**
 * Get user value from session/local storage or prompt
 */
function getUserValue() {
  return (
    sessionStorage.getItem("user") || localStorage.getItem("user") || "unknown"
  );
}

/**
 * Open edit dialog for a row
 */
function openEditDialog(section, serialNumber, rowData) {
  currentRevisionData = {
    type: "edit",
    section,
    serialNumber,
    rowData,
  };
  const editDialog = document.getElementById("editDialog");
  if (editDialog) {
    document.getElementById("editSection").value = section;
    document.getElementById("editRowData").value = JSON.stringify(
      rowData,
      null,
      2,
    );
    document.getElementById("editNotes").value = "";
    editDialog.showModal();
  }
}

/**
 * Open delete dialog for a row
 */
function openDeleteDialog(section, serialNumber, rowData) {
  currentRevisionData = {
    type: "delete",
    section,
    serialNumber,
    rowData,
  };
  const deleteDialog = document.getElementById("deleteDialog");
  if (deleteDialog) {
    document.getElementById("deleteSection").value = section;
    document.getElementById("deleteRowData").value = JSON.stringify(
      rowData,
      null,
      2,
    );
    document.getElementById("deleteNotes").value = "";
    deleteDialog.showModal();
  }
}

/**
 * Save revision (edit or delete)
 */
async function saveRevision(type, notes) {
  const endpoint = `/cert/revision/${type === "edit" ? "edit" : "delete"}`;
  const payload = {
    woNo: currentWoNo,
    section: currentRevisionData.section,
    serialNumber: currentRevisionData.serialNumber,
    originalData: currentRevisionData.rowData,
    notes: notes,
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User": getUserValue(),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Failed to save revision: ${response.statusText}`);
    }

    const data = await response.json();
    alert(
      `${type === "edit" ? "Edit" : "Delete"} recorded successfully (ID: ${
        data.revisionId
      })`,
    );

    document.getElementById("editDialog")?.close();
    document.getElementById("deleteDialog")?.close();
  } catch (error) {
    console.error("Error saving revision:", error);
    alert("Failed to save revision. Please try again.");
  }
}

/**
 * Open add dialog for a section
 */
function openAddDialog(section) {
  currentAddSection = section;
  const addDialog = document.getElementById("addDialog");
  if (!addDialog) return;

  document.getElementById("addSectionName").textContent = section;

  const formFields = document.getElementById("addFormFields");
  formFields.innerHTML = "";

  const fields = sectionFormFields[section] || [];
  fields.forEach((field) => {
    const div = document.createElement("div");
    div.className = "form-group";

    const label = document.createElement("label");
    label.htmlFor = `add_${field.name}`;
    label.textContent = field.label + (field.required ? " *" : "");
    div.appendChild(label);

    const input = document.createElement("input");
    input.type = field.type;
    input.id = `add_${field.name}`;
    input.name = field.name;
    input.required = field.required;
    input.style.width = "100%";
    input.style.padding = "0.5rem";
    input.style.border = "1px solid #ccc";
    input.style.borderRadius = "4px";
    div.appendChild(input);

    formFields.appendChild(div);
  });

  addDialog.showModal();
}

/**
 * Save new row
 */
async function saveNewRow() {
  const fields = sectionFormFields[currentAddSection] || [];
  const rowData = {};

  for (const field of fields) {
    const input = document.getElementById(`add_${field.name}`);
    if (field.required && !input.value.trim()) {
      alert(`${field.label} is required`);
      return;
    }
    rowData[field.name] = input.value.trim();
  }

  try {
    const response = await fetch(`/cert/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User": getUserValue(),
      },
      body: JSON.stringify({
        woNo: currentWoNo,
        section: currentAddSection,
        rowData: rowData,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to save row: ${response.statusText}`);
    }

    const data = await response.json();
    alert(
      `Row added successfully (ID: ${data.certAddId}). Status: PENDING approval`,
    );
    document.getElementById("addDialog")?.close();
  } catch (error) {
    console.error("Error saving new row:", error);
    alert("Failed to save row. Please try again.");
  }
}

/**
 * Create action cell with Edit/Delete buttons
 */
function createActionCell(section, serialNumber, rowData) {
  const td = document.createElement("td");
  td.className = "revision-actions";
  td.style.textAlign = "center";

  const btnEdit = document.createElement("button");
  btnEdit.type = "button";
  btnEdit.className = "btn-edit";
  btnEdit.textContent = "Edit";
  btnEdit.style.marginRight = "0.5rem";
  btnEdit.onclick = () => openEditDialog(section, serialNumber, rowData);

  const btnDelete = document.createElement("button");
  btnDelete.type = "button";
  btnDelete.className = "btn-delete";
  btnDelete.textContent = "Delete";
  btnDelete.onclick = () => openDeleteDialog(section, serialNumber, rowData);

  td.appendChild(btnEdit);
  td.appendChild(btnDelete);
  return td;
}

// ========== PAGE TABLE DISPLAY ==========
/**
 * Renders categorized item history as separate section tables on the page
 * Creates a section for each category with its own table with Edit/Delete/Add buttons
 */
async function renderCategorizedSections(
  woNumber,
  containerId = "item-history-sections",
) {
  try {
    currentWoNo = woNumber;
    const result = await fetchCertDataOptimized(woNumber);

    // Get or create container
    let container = document.getElementById(containerId);
    if (!container) {
      container = document.createElement("div");
      container.id = containerId;
      document.body.appendChild(container);
    }

    container.innerHTML = "";

    // Add summary at top
    const summary = document.createElement("div");
    summary.style.marginBottom = "20px";
    summary.style.padding = "15px";
    summary.style.backgroundColor = "#f0f0f0";
    summary.style.borderRadius = "5px";
    summary.style.border = "1px solid #ccc";

    const summaryTitle = document.createElement("h2");
    summaryTitle.textContent = `Work Order: ${woNumber}`;
    summary.appendChild(summaryTitle);

    const totalRecords = Object.values(result.categorized).reduce(
      (sum, arr) => sum + arr.length,
      0,
    );
    const summaryText = document.createElement("p");
    summaryText.innerHTML = `<strong>Total Records: ${totalRecords}</strong>`;
    summary.appendChild(summaryText);

    container.appendChild(summary);

    // Define section display order and labels
    const sectionMappings = [
      {
        key: "MATERIAL",
        label: "RAW MATERIALS",
        columnHeaders: ["Item", "Part Number", "Trace ID", "Actions"],
      },
      {
        key: "CHEM",
        label: "CHEMICAL TREATMENT",
        columnHeaders: [
          "Item",
          "Part Number",
          "Specification",
          "Trace ID",
          "Actions",
        ],
      },
      {
        key: "FWELD",
        label: "FUSION WELDING",
        columnHeaders: [
          "Item",
          "Part Number",
          "Specification",
          "Trace ID",
          "Actions",
        ],
      },
      {
        key: "SWELD",
        label: "SPOT WELDING",
        columnHeaders: [
          "Item",
          "Part Number",
          "Specification",
          "Trace ID",
          "Actions",
        ],
      },
      {
        key: "HEAT",
        label: "HEAT TREATING",
        columnHeaders: [
          "Item",
          "Part Number",
          "Specification",
          "Trace ID",
          "Actions",
        ],
      },
      {
        key: "PASS",
        label: "PASSIVATION",
        columnHeaders: [
          "Item",
          "Part Number",
          "Specification",
          "Trace ID",
          "Actions",
        ],
      },
      {
        key: "PAINT",
        label: "PAINT",
        columnHeaders: [
          "Item",
          "Part Number",
          "Specification",
          "Trace ID",
          "Actions",
        ],
      },
    ];

    // Render each section with records
    sectionMappings.forEach((sectionInfo) => {
      let records = result.categorized[sectionInfo.key] || [];

      // Deduplicate records based on JOB, SUFFIX, PART, SERIAL_NUMBER (like cert_old.mjs)
      const seen = new Set();
      const uniqueRecords = [];
      for (const item of records) {
        const key = [
          item.JOB ? item.JOB.trim() : "",
          item.SUFFIX ? item.SUFFIX.trim() : "",
          item.PART ? item.PART.trim() : item.PART2 ? item.PART2.trim() : "",
          item.SERIAL_NUMBER ? item.SERIAL_NUMBER.trim() : "",
        ].join("|");
        if (!seen.has(key)) {
          seen.add(key);
          uniqueRecords.push(item);
        }
      }
      records = uniqueRecords;

      // For MATERIAL section, exclude hardware (PRODUCT_LINE = 'HW'), raw materials (PRODUCT_LINE = 'RM'), and parts starting with 'SWC'
      if (sectionInfo.key === "MATERIAL") {
        records = records.filter((item) => {
          // Exclude if product line is HW or RM
          if (item.PRODUCT_LINE) {
            const pl = item.PRODUCT_LINE.trim().toUpperCase();
            if (pl === "HW" || pl === "RM") return false;
          }
          // Exclude if part starts with 'SWC'
          const part = (item.PART || item.PART2 || "").trim().toUpperCase();
          if (part.startsWith("SWC")) return false;
          return true;
        });
      }

      // Create title container with + button
      const titleContainer = document.createElement("div");
      titleContainer.style.display = "flex";
      titleContainer.style.alignItems = "center";
      titleContainer.style.gap = "1rem";
      titleContainer.style.marginTop = "20px";
      titleContainer.style.marginBottom = "1rem";

      const title = document.createElement("h3");
      title.textContent = sectionInfo.label;
      title.style.margin = "0";
      titleContainer.appendChild(title);

      const btnAdd = document.createElement("button");
      btnAdd.type = "button";
      btnAdd.className = "btn-primary";
      btnAdd.textContent = "+";
      btnAdd.style.width = "2rem";
      btnAdd.style.height = "2rem";
      btnAdd.style.padding = "0";
      btnAdd.style.fontSize = "1.2rem";
      btnAdd.style.display = "flex";
      btnAdd.style.alignItems = "center";
      btnAdd.style.justifyContent = "center";
      btnAdd.style.cursor = "pointer";
      btnAdd.style.border = "1px solid #ccc";
      btnAdd.style.borderRadius = "4px";
      btnAdd.style.backgroundColor = "#4CAF50";
      btnAdd.style.color = "white";
      btnAdd.onclick = () => openAddDialog(sectionInfo.key);
      titleContainer.appendChild(btnAdd);

      container.appendChild(titleContainer);

      if (records.length > 0) {
        const table = document.createElement("table");
        table.style.width = "100%";
        table.style.borderCollapse = "collapse";
        table.style.border = "2px solid #333";
        table.style.marginBottom = "20px";

        // Table header
        const thead = document.createElement("thead");
        const headerRow = document.createElement("tr");
        headerRow.style.backgroundColor = "#333";
        headerRow.style.color = "white";

        sectionInfo.columnHeaders.forEach((colHeader) => {
          const th = document.createElement("th");
          th.textContent = colHeader;
          th.style.border = "1px solid #999";
          th.style.padding = "9px";
          th.style.textAlign = colHeader === "Actions" ? "center" : "left";
          headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Table body
        const tbody = document.createElement("tbody");
        let itemNumber = 1;

        records.forEach((record, index) => {
          const row = document.createElement("tr");
          row.style.backgroundColor = index % 2 === 0 ? "white" : "#fafafa";
          row.style.borderBottom = "1px solid #ddd";

          // Item number
          const tdItem = document.createElement("td");
          tdItem.textContent = itemNumber.toString();
          tdItem.style.border = "1px solid #ddd";
          tdItem.style.padding = "7px";
          row.appendChild(tdItem);
          itemNumber++;

          // Part number
          const tdPart = document.createElement("td");
          tdPart.textContent = formatPartNumber(
            record.PART || record.PART2 || "",
          );
          tdPart.style.border = "1px solid #ddd";
          tdPart.style.padding = "7px";
          row.appendChild(tdPart);

          // Specification (for non-material items)
          if (sectionInfo.key !== "MATERIAL") {
            const tdSpec = document.createElement("td");
            tdSpec.textContent = record.OPERATION || "";
            tdSpec.title = record.OPERATION_CODE || ""; // Tooltip shows operation code
            tdSpec.style.border = "1px solid #ddd";
            tdSpec.style.padding = "7px";
            tdSpec.style.cursor = "help"; // Show help cursor on hover
            row.appendChild(tdSpec);
          }

          // Serial Number / Trace ID
          const tdSerial = document.createElement("td");
          let displaySerialNumber = "";

          // For PASS section, use CERT_ID field if available
          if (sectionInfo.key === "PASS" && record.CERT_ID) {
            displaySerialNumber = record.CERT_ID;
          } else {
            displaySerialNumber = record.SERIAL_NUMBER || "";
            if (displaySerialNumber.startsWith("PO: ")) {
              displaySerialNumber = displaySerialNumber.substring(4).trim();
            }
            // Remove leading zeros
            while (displaySerialNumber.charAt(0) === "0") {
              displaySerialNumber = displaySerialNumber.substring(1);
            }
          }

          const jobInfo =
            (record.JOB ? record.JOB.trim() : "") +
            (record.SUFFIX ? `-${record.SUFFIX.trim()}` : "");
          if (jobInfo) {
            displaySerialNumber += ` (${jobInfo})`;
          }
          tdSerial.textContent = displaySerialNumber;
          tdSerial.style.border = "1px solid #ddd";
          tdSerial.style.padding = "7px";
          row.appendChild(tdSerial);

          // Actions
          const actionCell = createActionCell(
            sectionInfo.key,
            record.SERIAL_NUMBER?.trim(),
            {
              job: record.JOB?.trim(),
              part: record.PART?.trim() || record.PART2?.trim(),
              operation: record.OPERATION?.trim(),
              serialNumber: record.SERIAL_NUMBER?.trim(),
            },
          );
          row.appendChild(actionCell);

          tbody.appendChild(row);
        });
        table.appendChild(tbody);
        container.appendChild(table);
      } else {
        const noDataDiv = document.createElement("div");
        noDataDiv.className = "no-data-section";
        noDataDiv.style.padding = "1rem";
        noDataDiv.style.textAlign = "center";
        noDataDiv.style.backgroundColor = "#f9f9f9";
        noDataDiv.style.border = "1px solid #ddd";
        noDataDiv.style.borderRadius = "4px";
        noDataDiv.style.marginBottom = "20px";
        noDataDiv.innerHTML = `<p>No ${sectionInfo.label.toLowerCase()} items found.</p>`;
        container.appendChild(noDataDiv);
      }
    });

    console.log(
      `Rendered ${totalRecords} records in ${sectionMappings.length} sections`,
    );
    return result;
  } catch (error) {
    console.error("Error rendering categorized sections:", error);
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = `<p style="color: red; padding: 15px; background-color: #ffebee; border-radius: 5px;">Error loading data: ${error.message}</p>`;
    }
  }
}

// ========== MAKE AVAILABLE IN BROWSER CONSOLE ==========
// Use self-invoking function to expose to window immediately
(function () {
  // Attach to window object so it can be called directly from console
  window.fetchCertDataOptimized = fetchCertDataOptimized;
  window.renderCategorizedSections = renderCategorizedSections;

  console.log(
    "%c✓ Certification Lookup Functions Loaded",
    "color: #00aa00; font-weight: bold;",
  );
  console.log("Available commands:");
  console.log(
    "  renderCategorizedSections(woNumber, containerId='item-history-sections')",
  );
})();

// ========== EXPORT FOR USE IN CERT PAGE ==========
export { fetchCertDataOptimized, renderCategorizedSections };

// ========== SEARCH RESULTS DISPLAY ==========
/**
 * Display search results in a simple table on the page
 */
function displaySearchResults(data, woNumber) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    console.log("No data to display");
    return;
  }

  console.log("=== DISPLAY SEARCH RESULTS ===");
  console.log("Input data:", data);
  console.log("Number of records:", data.length);
  // DEV: data.forEach((r, i) => {
  //   let sn = r.SERIAL_NUMBER || "";
  //   if (sn.startsWith("PO: ")) {
  //     sn = sn.substring(4);
  //   }
  //   console.log(
  //     `[${i}] SERIAL_NUMBER: "${r.SERIAL_NUMBER}" => after trim: "${sn}"`
  //   );
  // });

  // Get the search results container and table body
  const resultsContainer = document.getElementById("searchResultsContainer");
  const resultsBody = document.getElementById("searchResultsBody");

  if (!resultsContainer || !resultsBody) {
    console.error("Search results container or table body not found");
    return;
  }

  // Clear previous results
  resultsBody.innerHTML = "";

  // Pattern to match ######-###
  const detailPattern = /^\d{6}-\d{3}$/;
  console.log("Looking for serial numbers matching pattern:", detailPattern);

  // First, deduplicate serial numbers that match the pattern
  const uniqueSerialNumbers = new Set();
  data.forEach((record) => {
    let serialNumber = (record.SERIAL_NUMBER || "").trim();
    if (serialNumber.startsWith("PO: ")) {
      serialNumber = serialNumber.substring(4).trim();
    }
    if (detailPattern.test(serialNumber)) {
      uniqueSerialNumbers.add(serialNumber);
    }
  });

  console.log(
    `Found ${uniqueSerialNumbers.size} unique serial numbers to fetch`,
  );

  // DEV: Fetch detail data only for unique serial numbers
  // DEV: const detailFetches = Array.from(uniqueSerialNumbers).map((serialNumber) => {
  //   // DEV: console.log(`FETCHING DETAIL DATA for: ${serialNumber}`);
  //   return fetch(
  //     `http://${
  //       window.location.hostname
  //     }:${port}/cert/detail/${encodeURIComponent(serialNumber)}`,
  //     {
  //       method: "GET",
  //       headers: {
  //         "Content-Type": "application/json",
  //       },
  //     }
  //   )
  //     .then((response) => {
  //       if (response.ok) {
  //         return response.json();
  //       }
  //       return [];
  //     })
  //     .catch((error) => {
  //       console.error(`Error fetching detail data for ${serialNumber}:`, error);
  //       return [];
  //     });
  // });

  // DEV: Skip detail fetches - render original data only
  const detailFetches = [];

  // Wait for all detail fetches to complete
  Promise.all(detailFetches).then((allDetailData) => {
    // Combine original data with all fetched detail data
    let combinedData = [...data];

    console.log("Detail fetch results:", allDetailData);
    // DEV:
    // DEV: allDetailData.forEach((detailData, index) => {
    //   // DEV: console.log(
    //   //   `Detail data [${index}]:`,
    //   //   detailData,
    //   //   "is array?",
    //   //   Array.isArray(detailData)
    //   // );
    //   if (detailData && Array.isArray(detailData) && detailData.length > 0) {
    //     // DEV: console.log(
    //     //   `Appending ${detailData.length} records from detail fetch ${index}`
    //     // );
    //     combinedData = combinedData.concat(detailData);
    //   }
    // });

    allDetailData.forEach((detailData) => {
      if (detailData && Array.isArray(detailData) && detailData.length > 0) {
        combinedData = combinedData.concat(detailData);
      }
    });

    console.log(
      `Original records: ${data.length}, Combined records: ${combinedData.length}`,
    );

    // Filter out records with SEQUENCE equals "999999"
    const filteredData = combinedData.filter((record) => {
      const sequence = (record.SEQUENCE || "").trim();
      return sequence !== "999999";
    });

    console.log(
      `After filtering out SEQUENCE equals "999999": ${filteredData.length} records`,
    );

    // Now render the filtered data
    filteredData.forEach((record) => {
      const row = document.createElement("tr");
      row.style.borderBottom = "1px solid #ddd";

      // Trim "PO: " prefix from SERIAL_NUMBER if present
      let serialNumber = record.SERIAL_NUMBER || "";
      if (serialNumber.startsWith("PO: ")) {
        serialNumber = serialNumber.substring(4);
      }

      row.innerHTML = `
        <td style="border: 1px solid #ddd; padding: 9px;">${
          record.PART || ""
        }</td>
        <td style="border: 1px solid #ddd; padding: 9px;">${
          record.JOB || ""
        }</td>
        <td style="border: 1px solid #ddd; padding: 9px;">${
          record.SUFFIX || ""
        }</td>
        <td style="border: 1px solid #ddd; padding: 9px;">${
          record.SEQUENCE || ""
        }</td>
        <td style="border: 1px solid #ddd; padding: 9px;">${serialNumber}</td>
      `;

      resultsBody.appendChild(row);
    });

    // Show the results container
    resultsContainer.style.display = "block";

    console.log(
      `Displayed ${combinedData.length} total records for WO: ${woNumber}`,
    );
  });
}

// ========== DISPLAY DETAIL TABLE ==========
/**
 * Display detail data in a table on the page
 */
function displayDetailTable(data, serialNumber) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    console.log("No detail data to display");
    alert(`No detail data found for serial number: ${serialNumber}`);
    return;
  }

  // Create or get detail container
  let detailContainer = document.getElementById("detailDataContainer");
  if (!detailContainer) {
    detailContainer = document.createElement("div");
    detailContainer.id = "detailDataContainer";
    detailContainer.style.marginTop = "30px";

    // Insert after search results
    const searchContainer = document.getElementById("searchResultsContainer");
    if (searchContainer && searchContainer.parentNode) {
      searchContainer.parentNode.insertBefore(
        detailContainer,
        searchContainer.nextSibling,
      );
    } else {
      // Fallback: append to main
      const main = document.querySelector("main");
      if (main) {
        main.appendChild(detailContainer);
      } else {
        document.body.appendChild(detailContainer);
      }
    }
    console.log("Created new detail container");
  }

  // Create detail table HTML
  let detailHTML = `
    <h3>Detail Data for Serial Number: ${serialNumber}</h3>
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-family: Arial, sans-serif;">
      <thead style="background-color: #2196F3; color: white;">
        <tr>
          <th style="border: 1px solid #ddd; padding: 11px; text-align: left;">PART</th>
          <th style="border: 1px solid #ddd; padding: 11px; text-align: left;">JOB</th>
          <th style="border: 1px solid #ddd; padding: 11px; text-align: left;">SUFFIX</th>
          <th style="border: 1px solid #ddd; padding: 11px; text-align: left;">SEQUENCE</th>
          <th style="border: 1px solid #ddd; padding: 11px; text-align: left;">SERIAL_NUMBER</th>
        </tr>
      </thead>
      <tbody>
  `;

  data.forEach((record) => {
    let displaySerialNumber = record.SERIAL_NUMBER || "";
    if (displaySerialNumber.startsWith("PO: ")) {
      displaySerialNumber = displaySerialNumber.substring(4);
    }

    detailHTML += `
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="border: 1px solid #ddd; padding: 10px;">${
          record.PART || ""
        }</td>
        <td style="border: 1px solid #ddd; padding: 10px;">${
          record.JOB || ""
        }</td>
        <td style="border: 1px solid #ddd; padding: 10px;">${
          record.SUFFIX || ""
        }</td>
        <td style="border: 1px solid #ddd; padding: 10px;">${
          record.SEQUENCE || ""
        }</td>
        <td style="border: 1px solid #ddd; padding: 10px;">${displaySerialNumber}</td>
      </tr>
    `;
  });

  detailHTML += `
      </tbody>
    </table>
  `;

  detailContainer.innerHTML = detailHTML;

  // Scroll to the detail container
  detailContainer.scrollIntoView({ behavior: "smooth", block: "start" });

  console.log(
    `Displayed ${data.length} detail records for serial number: ${serialNumber}`,
  );
}

// ========== DIALOG EVENT LISTENERS ==========
document.addEventListener("DOMContentLoaded", () => {
  // Edit form submission
  const editForm = document.getElementById("editForm");
  if (editForm) {
    editForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const notes = document.getElementById("editNotes").value.trim();
      if (!notes) {
        alert("Please enter a reason for the change.");
        return;
      }
      await saveRevision("edit", notes);
    });
  }

  // Delete form submission
  const deleteForm = document.getElementById("deleteForm");
  if (deleteForm) {
    deleteForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const notes = document.getElementById("deleteNotes").value.trim();
      if (!notes) {
        alert("Please enter a reason for the deletion.");
        return;
      }
      await saveRevision("delete", notes);
    });
  }

  // Add form submission
  const addForm = document.getElementById("addForm");
  if (addForm) {
    addForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      await saveNewRow();
    });
  }

  // Close button handlers
  document.querySelectorAll(".close-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.target.closest("dialog")?.close();
    });
  });

  // Cancel button handlers
  const editCancel = document.getElementById("editCancel");
  if (editCancel) {
    editCancel.addEventListener("click", () => {
      document.getElementById("editDialog")?.close();
    });
  }

  const deleteCancel = document.getElementById("deleteCancel");
  if (deleteCancel) {
    deleteCancel.addEventListener("click", () => {
      document.getElementById("deleteDialog")?.close();
    });
  }

  const addCancel = document.getElementById("addCancel");
  if (addCancel) {
    addCancel.addEventListener("click", () => {
      document.getElementById("addDialog")?.close();
    });
  }
});

// ========== SEARCH EVENT HANDLER ==========
document.addEventListener("DOMContentLoaded", () => {
  const btnSearch = document.getElementById("btnSearch");
  const woNo = document.getElementById("woNo");

  if (btnSearch) {
    btnSearch.addEventListener("click", async (event) => {
      event.preventDefault();

      const woNumber = woNo.value.trim();
      if (!woNumber) {
        console.error("Work Order No is empty");
        alert("Please enter a Work Order number");
        return;
      }

      try {
        // Start timer
        const startTime = performance.now();

        // Clear previous results
        const traceContainer = document.getElementById("trace");
        if (traceContainer) {
          traceContainer.innerHTML = "";
        }

        // Show loading indicator
        const loadingIndicator = document.getElementById("loadingIndicator");
        if (loadingIndicator) {
          loadingIndicator.style.display = "block";
          loadingIndicator.innerHTML =
            '<p>Loading... <span id="elapsed">0</span>s</p>';

          // Update elapsed time every 100ms
          const timerInterval = setInterval(() => {
            const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
            const elapsedSpan = document.getElementById("elapsed");
            if (elapsedSpan) {
              elapsedSpan.textContent = elapsed;
            }
          }, 100);

          // Store interval ID for cleanup
          loadingIndicator.dataset.timerInterval = timerInterval;
        }

        // Fetch item history with drill-down processing and render categorized sections
        await renderCategorizedSections(woNumber, "trace");

        // Calculate total time
        const totalTime = ((performance.now() - startTime) / 1000).toFixed(2);

        // Show completion time
        if (loadingIndicator) {
          clearInterval(parseInt(loadingIndicator.dataset.timerInterval));
          loadingIndicator.innerHTML = `<p style="color: #00aa00; font-weight: bold;">Completed in ${totalTime}s</p>`;

          // Hide after 3 seconds
          setTimeout(() => {
            loadingIndicator.style.display = "none";
          }, 3000);
        }
      } catch (error) {
        console.error("Error during search:", error);
        alert(`Error: ${error.message}`);

        // Hide loading indicator
        const loadingIndicator = document.getElementById("loadingIndicator");
        if (loadingIndicator) {
          loadingIndicator.style.display = "none";
        }
      }
    });
  }
});

// ========== MAKE AVAILABLE IN BROWSER CONSOLE ==========
// Attach to window object so it can be called directly from console
window.renderCategorizedSections = renderCategorizedSections;
window.displaySearchResults = displaySearchResults;
window.openEditDialog = openEditDialog;
window.openDeleteDialog = openDeleteDialog;
window.openAddDialog = openAddDialog;
window.saveRevision = saveRevision;
window.saveNewRow = saveNewRow;
window.formatPartNumber = formatPartNumber;
