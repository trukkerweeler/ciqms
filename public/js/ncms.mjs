import {
  loadHeaderFooter,
  getSessionUser,
  getConfig,
  getApiUrl,
} from "./utils.mjs";
import { calculateDaysOverdue, getRowColor } from "./escalation-utils.mjs";
import users from "./users.mjs";

// Initialize header/footer
loadHeaderFooter();

// Configuration - will be initialized in DOMContentLoaded
let apiUrl = "";
let url = "";
let sortOrder = "asc";
let user; // Will be set in initialization
let config; // Will be set in initialization
let allNcmData = []; // Store all NCM data for filtering

document.addEventListener("DOMContentLoaded", async function () {
  apiUrl = await getApiUrl();
  url = `${apiUrl}/ncm`;
  user = await getSessionUser();
  config = await getConfig();
  setupEventListeners();
  // Add event listener for closed toggle
  const showClosedToggle = document.getElementById("showClosedToggle");
  if (showClosedToggle) {
    showClosedToggle.addEventListener("change", () => {
      applyFilters();
    });
  }
  // Add event listeners for NCM Type and Subject filters
  const filterNCMType = document.getElementById("filterNCMType");
  if (filterNCMType) {
    filterNCMType.addEventListener("change", () => {
      applyFilters();
    });
  }
  const filterSubject = document.getElementById("filterSubject");
  if (filterSubject) {
    filterSubject.addEventListener("change", () => {
      applyFilters();
    });
  }
  await loadNcmData();
  await loadSubjects(); // Load subjects for the dropdown
  await loadCauses(); // Load causes for the dropdown
  await loadNCMTypes(); // Load NCM types for the dropdown
  await populateFilterDropdowns(); // Populate filter dropdowns
});

function setupEventListeners() {
  // Add NCM button
  const addNcmBtn = document.getElementById("addNcmBtn");
  if (addNcmBtn) {
    addNcmBtn.addEventListener("click", openAddNcmDialog);
  }

  // Close button for add NCM dialog
  const closeAddBtn = document.getElementById("closeAddBtn");
  if (closeAddBtn) {
    closeAddBtn.addEventListener("click", () => {
      document.getElementById("addNcmDialog").close();
    });
  }

  // Save NCM form
  const saveNcmBtn = document.getElementById("saveNcmBtn");
  if (saveNcmBtn) {
    saveNcmBtn.addEventListener("click", saveNcm);
  }

  // NCM Type change listener for CAL validation hint
  const ncmTypeSelect = document.getElementById("NCM_TYPE");
  if (ncmTypeSelect) {
    ncmTypeSelect.addEventListener("change", (e) => {
      if (e.target.value === "CAL") {
        // Show helper text for CAL type
        const subjectGroup = document.querySelector('label[for="SUBJECT"]');
        if (subjectGroup && !document.getElementById("calHint")) {
          const hint = document.createElement("small");
          hint.id = "calHint";
          hint.style.display = "block";
          hint.style.color = "#0066cc";
          hint.style.fontSize = "0.85em";
          hint.style.marginTop = "0.25rem";
          hint.innerHTML = "💡 For CAL type: Use EOL, OOT, or OTHER";
          subjectGroup.parentElement.appendChild(hint);
        }
      } else {
        // Remove hint if switching away from CAL
        const hint = document.getElementById("calHint");
        if (hint) {
          hint.remove();
        }
      }
    });
  }

  // Close button for RET reminder dialog
  const closeRetReminderBtn = document.getElementById("closeRetReminderBtn");
  if (closeRetReminderBtn) {
    closeRetReminderBtn.addEventListener("click", () => {
      document.getElementById("retReminderDialog").close();
    });
  }

  // Close dialog on outside click for add NCM dialog
  const addNcmDialog = document.getElementById("addNcmDialog");
  if (addNcmDialog) {
    addNcmDialog.addEventListener("click", (e) => {
      if (e.target === addNcmDialog) {
        addNcmDialog.close();
      }
    });
  }

  // Trend Dialog Event Listeners
  const closeTrendBtn = document.getElementById("closeTrendBtn");
  if (closeTrendBtn) {
    closeTrendBtn.addEventListener("click", () => {
      document.getElementById("trendDialog").close();
    });
  }

  const saveTrendBtn = document.getElementById("saveTrendBtn");
  if (saveTrendBtn) {
    saveTrendBtn.addEventListener("click", saveTrend);
  }

  // Close dialog on outside click for trend dialog
  const trendDialog = document.getElementById("trendDialog");
  if (trendDialog) {
    trendDialog.addEventListener("click", (e) => {
      if (e.target === trendDialog) {
        trendDialog.close();
      }
    });
  }
}

async function openAddNcmDialog() {
  const dialog = document.getElementById("addNcmDialog");
  if (dialog) {
    // Reset form and set today's date
    const form = document.getElementById("addNcmForm");
    form.reset();

    // Set today's date as default for NCM_DATE
    const today = new Date();
    document.getElementById("NCM_DATE").value = today
      .toISOString()
      .slice(0, 10);

    // Set due date to 30 days from now
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    document.getElementById("DUE_DATE").value = dueDate
      .toISOString()
      .slice(0, 10);

    dialog.showModal();
  }
}

// Check if user needs to see RET reminder today
async function checkAndShowRetReminder() {
  try {
    const checkResponse = await fetch(`${url}/check-ret-reminder`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user: user || "TKENT", ncmCode: "RET" }),
    });

    const result = await checkResponse.json();

    if (result.showReminder) {
      // Show the reminder dialog
      const retReminderDialog = document.getElementById("retReminderDialog");
      if (retReminderDialog) {
        retReminderDialog.showModal();

        // Log that reminder was shown
        await fetch(`${url}/log-ret-reminder`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ user: user || "TKENT", ncmCode: "RET" }),
        });
      }
    }
  } catch (error) {
    console.error("Error checking RET reminder:", error);
    // Don't block the workflow if reminder check fails
  }
}
async function saveNcm(event) {
  event.preventDefault();
  const form = document.getElementById("addNcmForm");
  const formData = new FormData(form);

  try {
    // Get next ID from server
    const nextIdResponse = await fetch(`${url}/nextId`);
    const nextId = await nextIdResponse.json();

    // Prepare current timestamp
    const currentDate = new Date();
    const myRequestDate = currentDate
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    // Build data object
    const dataJson = {
      NCM_ID: nextId,
      CREATE_DATE: myRequestDate,
      CREATE_BY: user || "TKENT",
      STATUS: "OPEN",
      CLOSED: "N", // Default to 'N' (No) for new records
    };

    // Add form data with proper case handling
    for (let field of formData.keys()) {
      if (
        [
          "PEOPLE_ID",
          "ASSIGNED_TO",
          "PRODUCT_ID",
          "SUPPLIER_ID",
          "CUSTOMER_ID",
        ].includes(field)
      ) {
        const value = formData.get(field);
        dataJson[field] = value ? value.toUpperCase() : value;
      } else {
        dataJson[field] = formData.get(field);
      }
    }

    // Subject length validation
    if (dataJson.SUBJECT && dataJson.SUBJECT.length > 6) {
      alert(
        "Subject must be 6 characters or less. Please see the help file for valid codes.",
      );
      window.open("/ncmhelp.html", "_blank");
      const subjectField = document.querySelector("#SUBJECT");
      if (subjectField) subjectField.focus();
      return;
    }

    // CAL type subject code validation
    if (dataJson.NCM_TYPE === "CAL") {
      const validCalSubjects = ["EOL", "OOT", "OTHER"];
      const enteredSubject = dataJson.SUBJECT
        ? dataJson.SUBJECT.toUpperCase()
        : "";

      if (enteredSubject && !validCalSubjects.includes(enteredSubject)) {
        const proceed = confirm(
          `⚠️ Warning: For CAL (Calibration) type NCMs, the recommended subject codes are:\n• EOL (End of Life)\n• OOT (Out of Tolerance)\n• OTHER\n\nYou entered: "${enteredSubject}"\n\nPlease refer to the help file for proper codes.\n\nClick OK to continue anyway, or Cancel to return and select the correct code.`,
        );

        if (!proceed) {
          window.open("/ncmhelp.html", "_blank");
          const subjectField = document.querySelector("#SUBJECT");
          if (subjectField) subjectField.focus();
          return;
        }
      }
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dataJson),
    });

    if (response.ok) {
      document.getElementById("addNcmDialog").close();
      await loadNcmData(); // Reload the data

      // Check if NCM_TYPE is RET and show reminder if needed
      if (dataJson.NCM_TYPE === "RET") {
        await checkAndShowRetReminder();
      }
    } else {
      const errorText = await response.text();
      alert(`Failed to save NCM: ${errorText}`);
    }
  } catch (error) {
    console.error("Error saving NCM:", error);
    alert("Failed to save NCM. Please try again.");
  }
}

async function loadNcmData() {
  try {
    // Always fetch all records
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    allNcmData = await response.json();
    applyFilters();
  } catch (error) {
    console.error("Error loading NCM data:", error);
    document.getElementById("ncmTableContainer").innerHTML =
      '<p class="error">Failed to load NCM data. Please refresh the page.</p>';
  }
}

function applyFilters() {
  const showClosedToggle = document.getElementById("showClosedToggle");
  const closedNOnly = showClosedToggle ? showClosedToggle.checked : false;
  const filterNCMType = document.getElementById("filterNCMType");
  const selectedNCMType = filterNCMType ? filterNCMType.value : "";
  const filterSubject = document.getElementById("filterSubject");
  const selectedSubject = filterSubject ? filterSubject.value : "";

  let filteredData = allNcmData;

  // Filter by closed status
  if (closedNOnly) {
    filteredData = filteredData.filter((item) => item.CLOSED === "N");
  }

  // Filter by NCM Type
  if (selectedNCMType) {
    filteredData = filteredData.filter(
      (item) => item.NCM_TYPE === selectedNCMType,
    );
  }

  // Filter by Subject
  if (selectedSubject) {
    filteredData = filteredData.filter(
      (item) => item.SUBJECT === selectedSubject,
    );
  }

  displayNcmTable(filteredData);
}

async function populateFilterDropdowns() {
  try {
    // Get unique NCM Types
    const ncmTypes = [
      ...new Set(allNcmData.map((item) => item.NCM_TYPE).filter(Boolean)),
    ].sort();
    const filterNCMType = document.getElementById("filterNCMType");
    if (filterNCMType && ncmTypes.length > 0) {
      ncmTypes.forEach((type) => {
        const option = document.createElement("option");
        option.value = type;
        option.textContent = type;
        filterNCMType.appendChild(option);
      });
    }

    // Get unique Subjects
    const subjects = [
      ...new Set(allNcmData.map((item) => item.SUBJECT).filter(Boolean)),
    ].sort();
    const filterSubject = document.getElementById("filterSubject");
    if (filterSubject && subjects.length > 0) {
      subjects.forEach((subject) => {
        const option = document.createElement("option");
        option.value = subject;
        option.textContent = subject;
        filterSubject.appendChild(option);
      });
    }
  } catch (error) {
    console.error("Error populating filter dropdowns:", error);
  }
}

function displayNcmTable(data) {
  const container = document.getElementById("ncmTableContainer");
  if (!container) return;

  if (!data || data.length === 0) {
    container.innerHTML = "<p>No NCM records found.</p>";
    return;
  }

  const table = document.createElement("table");
  table.className = "data-table";
  table.style.marginBottom = "0";
  table.style.tableLayout = "fixed";

  const headers = [
    "NCM ID",
    "Date",
    "Type",
    "Subject",
    "Assignee",
    "Due Date",
    "Product ID",
    "PO Number",
    "Trend",
    "Description",
    "Closed",
  ];

  // Create colgroup with saved widths or defaults
  const colgroup = document.createElement("colgroup");
  const savedWidths = getColumnWidths();
  headers.forEach((header, index) => {
    const col = document.createElement("col");
    if (savedWidths && savedWidths[index]) {
      col.style.width = savedWidths[index];
    } else {
      col.style.width = "auto";
    }
    colgroup.appendChild(col);
  });
  table.appendChild(colgroup);

  // Create header
  const thead = document.createElement("thead");
  thead.style.position = "sticky";
  thead.style.top = "0";
  thead.style.zIndex = "1";

  const headerRow = document.createElement("tr");

  headers.forEach((header, index) => {
    const th = document.createElement("th");
    th.textContent = header;
    th.style.cursor = "default";
    th.dataset.columnIndex = index;

    // Create wrapper for header text to handle sorting
    const headerText = document.createElement("span");
    headerText.textContent = header;
    headerText.style.cursor = "pointer";
    headerText.style.display = "inline-block";
    headerText.style.userSelect = "none";
    headerText.style.marginRight = "4px";
    headerText.addEventListener("click", () => sortTable(index));

    th.textContent = "";
    th.appendChild(headerText);
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Create body
  const tbody = document.createElement("tbody");
  tbody.id = "ncmTableBody";

  data.forEach((item) => {
    const row = document.createElement("tr");

    // Apply escalation color
    const daysOverdue = calculateDaysOverdue(item.DUE_DATE);
    getRowColor(item, "NONCONFORMANCE", daysOverdue).then((color) => {
      if (color) {
        row.style.backgroundColor = color;
      }
    });

    row.innerHTML = `
      <td><a href="ncm.html?id=${item.NCM_ID}">${item.NCM_ID}</a></td>
      <td>${item.NCM_DATE ? formatDate(item.NCM_DATE) : ""}</td>
      <td>${item.NCM_TYPE || ""}</td>
      <td>${item.SUBJECT || ""}</td>
      <td>${item.ASSIGNED_TO || ""}</td>
      <td>${item.DUE_DATE ? formatDate(item.DUE_DATE) : ""}</td>
      <td>${item.PRODUCT_ID || ""}</td>
      <td>${item.PO_NUMBER || ""}</td>
      <td>${
        item.PROCESS_ID
          ? `<button type="button" class="btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="openTrendDialog('${item.NCM_ID}')"><!-- <span class=\"btn-icon\">📈</span> --> ${item.PROCESS_ID}</button>`
          : `<button type="button" class="btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="openTrendDialog('${item.NCM_ID}')">Edit</button>`
      }</td>
      <td>${item.DESCRIPTION || ""}</td>
      <td>${item.CLOSED === "Y" ? "Yes" : "No"}</td>
    `;

    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  container.innerHTML = "";
  container.appendChild(table);

  // Initialize resizable columns
  initializeColumnResizing(table);
}

function truncateText(text, maxLength) {
  if (!text) return "";
  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
}

function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString();
}

function sortTable(columnIndex) {
  const tbody = document.getElementById("ncmTableBody");
  if (!tbody) return;

  const rows = Array.from(tbody.querySelectorAll("tr"));
  const headerCells = document.querySelectorAll("thead th");

  // Toggle sort order
  sortOrder = sortOrder === "asc" ? "desc" : "asc";

  rows.sort((a, b) => {
    const aVal = a.cells[columnIndex].textContent.trim();
    const bVal = b.cells[columnIndex].textContent.trim();

    // Handle numeric columns
    if (columnIndex === 0) {
      // NCM ID
      const aNum = parseFloat(aVal) || 0;
      const bNum = parseFloat(bVal) || 0;
      return sortOrder === "asc" ? aNum - bNum : bNum - aNum;
    }

    // Handle date columns
    if (columnIndex === 1 || columnIndex === 2) {
      // Date and Due Date
      const aDate = new Date(aVal) || new Date(0);
      const bDate = new Date(bVal) || new Date(0);
      return sortOrder === "asc" ? aDate - bDate : bDate - aDate;
    }

    // Handle text columns
    return sortOrder === "asc"
      ? aVal.localeCompare(bVal)
      : bVal.localeCompare(aVal);
  });

  // Clear tbody and append sorted rows
  tbody.innerHTML = "";
  rows.forEach((row) => tbody.appendChild(row));

  // Update sort indicators
  updateSortIndicators(headerCells, columnIndex);
}

function updateSortIndicators(headerCells, activeColumnIndex) {
  headerCells.forEach((th, index) => {
    // Remove existing sort indicators
    th.textContent = th.textContent.replace(/ [↑↓]$/, "");

    // Add indicator to active column
    if (index === activeColumnIndex) {
      const indicator = sortOrder === "asc" ? " ↑" : " ↓";
      th.textContent += indicator;
    }
  });
}

// Trend Dialog Functions
async function openTrendDialog(ncmId) {
  const dialog = document.getElementById("trendDialog");
  const titleElement = document.getElementById("trendDialogTitle");
  const formContainer = document.getElementById("trendFormContainer");

  if (!dialog || !titleElement || !formContainer) return;

  // Set title
  titleElement.textContent = `Edit Trend Data - NCM: ${ncmId}`;

  // Store NCM ID for later use
  dialog.dataset.ncmId = ncmId;

  try {
    // Fetch trend data
    const trendUrl = `${apiUrl}/trend/${ncmId}`;
    const response = await fetch(trendUrl, { method: "GET" });
    const records = await response.json();

    // Clear existing form content
    formContainer.innerHTML = "";

    if (records.length > 0) {
      // Generate form fields based on the data
      const data = records[0];

      for (let key in data) {
        if (key !== "NCM_ID") {
          const formGroup = document.createElement("div");
          formGroup.className = "form-group";

          const label = document.createElement("label");
          label.setAttribute("for", key);
          label.textContent = formatFieldName(key);

          const input = document.createElement("input");
          input.setAttribute("type", "text");
          input.setAttribute("id", key);
          input.setAttribute("name", key);
          input.value = data[key] || "";

          formGroup.appendChild(label);
          formGroup.appendChild(input);
          formContainer.appendChild(formGroup);
        }
      }
    } else {
      // No data found - create basic form with common fields
      const commonFields = [
        "PROCESS_ID",
        "CORRECTIVE_ID",
        "TREND_TYPE",
        "TREND_DESCRIPTION",
        "ROOT_CAUSE",
        "PREVENTIVE_ACTION",
        "SUPPLIER_ID",
        "CUSTOMER_ID",
      ];

      commonFields.forEach((fieldName) => {
        const formGroup = document.createElement("div");
        formGroup.className = "form-group";

        const label = document.createElement("label");
        label.setAttribute("for", fieldName);
        label.textContent = formatFieldName(fieldName);

        const input = document.createElement("input");
        input.setAttribute("type", "text");
        input.setAttribute("id", fieldName);
        input.setAttribute("name", fieldName);
        input.value = "";

        formGroup.appendChild(label);
        formGroup.appendChild(input);
        formContainer.appendChild(formGroup);
      });
    }

    dialog.showModal();
  } catch (error) {
    console.error("Error loading trend data:", error);
    alert("Failed to load trend data. Please try again.");
  }
}

async function saveTrend(event) {
  event.preventDefault();
  const dialog = document.getElementById("trendDialog");
  const form = document.getElementById("trendForm");
  const ncmId = dialog.dataset.ncmId;

  if (!ncmId) {
    alert("NCM ID not found");
    return;
  }

  const formData = new FormData(form);
  const data = {};

  // Convert form data to object
  for (let pair of formData.entries()) {
    data[pair[0]] = pair[1];
  }

  // Add metadata
  data.MODIFIED_BY = user || "TKENT";
  data.MODIFIED_DATE = new Date().toLocaleString();

  // Convert certain fields to uppercase
  if (data.CUSTOMER_ID) {
    data.CUSTOMER_ID = data.CUSTOMER_ID.toUpperCase();
  }
  if (data.SUPPLIER_ID) {
    data.SUPPLIER_ID = data.SUPPLIER_ID.toUpperCase();
  }

  try {
    // Save trend data
    const trendUrl = `${apiUrl}/trend/${ncmId}`;
    const response = await fetch(trendUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (result.affectedRows > 0) {
      // Handle corrective action link if provided
      if (data.CORRECTIVE_ID) {
        const corrData = { CORRECTIVE_ID: data.CORRECTIVE_ID };
        const corrUrl = `${apiUrl}/trend/${ncmId}/ncl`;

        await fetch(corrUrl, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(corrData),
        });
      }

      dialog.close();
      await loadNcmData(); // Refresh the table
    } else {
      alert("Failed to update trend data");
    }
  } catch (error) {
    console.error("Error saving trend data:", error);
    alert("Failed to save trend data. Please try again.");
  }
}

function formatFieldName(fieldName) {
  return fieldName.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

// Make openTrendDialog globally available
window.openTrendDialog = openTrendDialog;

// Function to fetch subjects from the server for the dropdown
async function loadSubjects() {
  try {
    const subjectsUrl = `${apiUrl}/ncm/subjects`;
    const response = await fetch(subjectsUrl, { method: "GET" });

    if (!response.ok) {
      console.error("Response not ok:", response.status, response.statusText);
      populateSubjectDropdown(getHardcodedSubjects());
      return;
    }

    const subjects = await response.json();

    if (subjects.length === 0) {
      populateSubjectDropdown(getHardcodedSubjects());
      return;
    }

    populateSubjectDropdown(subjects);
  } catch (error) {
    console.error("Error fetching subjects:", error);
    populateSubjectDropdown(getHardcodedSubjects());
  }
}

function populateSubjectDropdown(subjects) {
  const dropdown = document.getElementById("SUBJECT");
  if (!dropdown) return;

  // Clear existing options except the first one
  while (dropdown.children.length > 1) {
    dropdown.removeChild(dropdown.lastChild);
  }

  // Add subject options
  subjects.forEach((subject) => {
    const option = document.createElement("option");
    option.value = subject.SUBJECT || subject;
    option.textContent = subject.DESCRIPTION || subject;
    dropdown.appendChild(option);
  });
}

function getHardcodedSubjects() {
  return [
    "Incorrect part shipped",
    "Missing hardware",
    "Damaged in shipment",
    "Wrong quantity",
    "Quality issue",
    "Documentation error",
    "Manufacturing defect",
    "Supplier quality issue",
  ];
}

// Function to fetch causes from the server for the dropdown
async function loadCauses() {
  try {
    const causesUrl = `${apiUrl}/causemaint/`;
    const response = await fetch(causesUrl, { method: "GET" });

    if (!response.ok) {
      console.error("Response not ok:", response.status, response.statusText);
      populateCauseDropdown(getHardcodedCauses());
      return;
    }

    const causes = await response.json();

    if (causes.length === 0) {
      populateCauseDropdown(getHardcodedCauses());
      return;
    }

    populateCauseDropdown(causes);
  } catch (error) {
    console.error("Error fetching causes:", error);
    populateCauseDropdown(getHardcodedCauses());
  }
}

function populateCauseDropdown(causes) {
  const dropdown = document.getElementById("CAUSE");
  if (!dropdown) return;

  // Clear existing options except the first one
  while (dropdown.children.length > 1) {
    dropdown.removeChild(dropdown.lastChild);
  }

  // Add cause options
  causes.forEach((cause) => {
    const option = document.createElement("option");
    option.value = cause.CAUSE || cause;
    option.textContent = cause.CAUSE
      ? `${cause.CAUSE} - ${cause.DESCRIPTION}`
      : cause;
    dropdown.appendChild(option);
  });
}

function getHardcodedCauses() {
  return [
    "Material defect",
    "Process error",
    "Equipment malfunction",
    "Operator error",
    "Design issue",
    "Supplier quality",
    "Handling damage",
    "Documentation error",
  ];
}

// Function to fetch NCM Types from the server for the dropdown
async function loadNCMTypes() {
  try {
    const ncmTypesUrl = `${apiUrl}/ncm-type`;
    const response = await fetch(ncmTypesUrl, { method: "GET" });

    if (!response.ok) {
      console.error("Response not ok:", response.status, response.statusText);
      populateNCMTypeDropdown(getHardcodedNCMTypes());
      return;
    }

    const ncmTypes = await response.json();

    if (ncmTypes.length === 0) {
      populateNCMTypeDropdown(getHardcodedNCMTypes());
      return;
    }

    populateNCMTypeDropdown(ncmTypes);
  } catch (error) {
    console.error("Error fetching NCM types:", error);
    populateNCMTypeDropdown(getHardcodedNCMTypes());
  }
}

function populateNCMTypeDropdown(ncmTypes) {
  const dropdown = document.getElementById("NCM_TYPE");
  if (!dropdown) return;

  // Clear existing options except the first one
  while (dropdown.children.length > 1) {
    dropdown.removeChild(dropdown.lastChild);
  }

  // Add NCM type options
  ncmTypes.forEach((ncmType) => {
    const option = document.createElement("option");
    option.value = ncmType.NCM_TYPE || ncmType;
    option.textContent = ncmType.DESCRIPTION
      ? `${ncmType.NCM_TYPE} - ${ncmType.DESCRIPTION}`
      : ncmType.NCM_TYPE || ncmType;
    dropdown.appendChild(option);
  });
}

function getHardcodedNCMTypes() {
  return [
    {
      NCM_TYPE: "VPP",
      DESCRIPTION: "Verification of Purchased Product (Receiving Inspection)",
    },
    { NCM_TYPE: "WIP", DESCRIPTION: "Work In Process (Traveler)" },
    { NCM_TYPE: "FIN", DESCRIPTION: "Final Inspection" },
    { NCM_TYPE: "RET", DESCRIPTION: "Returns incl. Complaints" },
    { NCM_TYPE: "CAL", DESCRIPTION: "Calibration" },
  ];
}

// Column Resizing Functions
function getColumnWidths() {
  try {
    const widths = localStorage.getItem("ncm_column_widths");
    return widths ? JSON.parse(widths) : null;
  } catch (error) {
    console.error("Error retrieving column widths:", error);
    return null;
  }
}

function saveColumnWidths(widths) {
  try {
    localStorage.setItem("ncm_column_widths", JSON.stringify(widths));
  } catch (error) {
    console.error("Error saving column widths:", error);
  }
}

function initializeColumnResizing(table) {
  const headers = table.querySelectorAll("thead th");
  const colgroup = table.querySelector("colgroup");
  if (!colgroup) return;

  const cols = colgroup.querySelectorAll("col");

  headers.forEach((header, index) => {
    // Create resize handle
    const resizeHandle = document.createElement("div");
    resizeHandle.className = "column-resize-handle";
    resizeHandle.style.position = "absolute";
    resizeHandle.style.right = "0";
    resizeHandle.style.top = "0";
    resizeHandle.style.height = "100%";
    resizeHandle.style.width = "4px";
    resizeHandle.style.backgroundColor = "rgba(200, 200, 200, 0.5)";
    resizeHandle.style.borderRight = "1px solid #999";
    resizeHandle.style.cursor = "col-resize";
    resizeHandle.style.userSelect = "none";

    header.style.position = "relative";
    header.appendChild(resizeHandle);

    // Set up resize logic
    resizeHandle.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const startX = e.clientX;
      const currentCol = cols[index];
      const currentWidth = currentCol.offsetWidth;

      const onMouseMove = (moveEvent) => {
        const diff = moveEvent.clientX - startX;
        const newWidth = Math.max(50, currentWidth + diff); // 50px minimum
        currentCol.style.width = newWidth + "px";
      };

      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        resizeHandle.style.backgroundColor = "transparent";

        // Save the new widths to localStorage
        const widths = Array.from(cols).map((col) => col.style.width || "auto");
        saveColumnWidths(widths);
      };

      resizeHandle.style.backgroundColor = "rgba(100, 150, 255, 0.9)";
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });

    // Show handle more prominently on hover
    resizeHandle.addEventListener("mouseenter", () => {
      resizeHandle.style.backgroundColor = "rgba(100, 150, 255, 0.9)";
      resizeHandle.style.borderRight = "1px solid #0066ff";
    });

    resizeHandle.addEventListener("mouseleave", () => {
      resizeHandle.style.backgroundColor = "rgba(200, 200, 200, 0.5)";
      resizeHandle.style.borderRight = "1px solid #999";
    });
  });
}
